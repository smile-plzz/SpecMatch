// The pivot's real compatibility engine — compares a stored hardware profile
// against a specific game's sourced min/recommended requirements. This is
// deliberately a NEW module, not an edit to `scoring.js`'s `scoreGameForSpecs`:
// that function is still used by the unrouted legacy pages (Discover/Compare/
// Library/Wishlist/GameDetailModal) and rewriting it in place would break five
// call sites that expect its heuristic-tier output shape. See PIVOT-PLAN.md §3
// and DESIGN_HANDOFF.md §9/§13 for the reasoning.

import { rankCpu, rankGpu, rankRequirementString, CPU_RANK, GPU_RANK } from './hardwareRank'

const WEIGHTS = { gpu: 0.45, cpu: 0.30, ram: 0.15, vram: 0.10 }

function componentPct(userRank, minRank, recRank) {
  if (userRank == null || minRank == null) return null
  if (userRank < minRank) {
    // Below minimum — scale 0-40 by how far short, floor at 5 so it never reads as a flat zero.
    const gap = minRank - userRank
    return Math.max(5, 40 - gap * 8)
  }
  if (recRank == null || userRank >= recRank) {
    const over = recRank == null ? 0 : userRank - recRank
    return Math.min(100, 85 + over * 4)
  }
  // Between minimum and recommended — scale 60-85 by progress toward recommended.
  const span = Math.max(1, recRank - minRank)
  const progress = (userRank - minRank) / span
  return Math.round(60 + progress * 25)
}

function statusFromPct(pct) {
  if (pct == null) return 'unknown'
  if (pct < 45) return 'fail'
  if (pct < 80) return 'partial'
  return 'pass'
}

function parseDirectxMajor(value) {
  const match = String(value ?? '').match(/(\d+)/)
  return match ? Number(match[1]) : null
}

function osCompatible(userOsName, requiredOsString) {
  if (!userOsName || !requiredOsString) return true // unknown → don't hard-fail on missing data
  const req = requiredOsString.toLowerCase()
  const user = userOsName.toLowerCase()
  if (!req.includes('windows')) return true
  return user.includes('windows')
}

const VERDICT_ORDER = ['not-recommended', 'playable-limited', 'playable']

const SETTINGS_BAND = {
  playable: 'High settings likely at 1080p; 1440p should hold at Medium–High.',
  'playable-limited': 'Likely need Medium settings at 1080p for a stable experience — High settings may cause dips.',
  'not-recommended': 'Below the tested minimum for smooth play — expect Low settings and unstable frame pacing at best.',
  'insufficient-data': 'Not enough data to estimate expected settings confidently.',
}

export function evaluateCompatibility(specs, game) {
  const min = game.requirements.minimum
  const rec = game.requirements.recommended

  const userGpuRank = rankGpu(specs.gpu?.model)
  const minGpuRank = rankRequirementString(min.gpu, GPU_RANK)
  const recGpuRank = rankRequirementString(rec.gpu, GPU_RANK)
  const gpuPct = componentPct(userGpuRank, minGpuRank, recGpuRank)
  const gpuStatus = statusFromPct(gpuPct)

  const userCpuRank = rankCpu(specs.cpu?.model)
  const minCpuRank = rankRequirementString(min.cpu, CPU_RANK)
  const recCpuRank = rankRequirementString(rec.cpu, CPU_RANK)
  const cpuPct = componentPct(userCpuRank, minCpuRank, recCpuRank)
  const cpuStatus = statusFromPct(cpuPct)

  const userVram = specs.gpu?.vramGB ?? null
  const vramPct = userVram == null ? null : userVram >= rec.vramGB ? 95 : userVram >= min.vramGB ? 65 : 20
  const vramStatus = statusFromPct(vramPct)

  const userRam = specs.ramGB ?? null
  const ramPct = userRam == null ? null : userRam >= rec.ramGB ? 95 : userRam >= min.ramGB ? 65 : 20
  const ramStatus = statusFromPct(ramPct)

  const storageFree = Array.isArray(specs.storage)
    ? Math.max(0, ...specs.storage.map((d) => d.freeGB ?? 0))
    : specs.storage?.freeGB ?? null
  const storageStatus = storageFree == null ? 'unknown' : storageFree >= min.storageGB ? 'pass' : 'fail'

  const osOk = osCompatible(specs.os?.name, min.os)
  const dxUser = parseDirectxMajor(specs.directx)
  const dxReq = parseDirectxMajor(min.directx)
  const dxOk = dxUser == null || dxReq == null ? true : dxUser >= dxReq

  const components = [
    { label: 'GPU', you: specs.gpu?.model || 'Unknown', need: `${min.gpu} (min) / ${rec.gpu} (rec)`, status: gpuStatus },
    { label: 'CPU', you: specs.cpu?.model || 'Unknown', need: `${min.cpu} (min) / ${rec.cpu} (rec)`, status: cpuStatus },
    { label: 'VRAM', you: userVram != null ? `${userVram} GB` : 'Unknown', need: `${min.vramGB} GB (min) / ${rec.vramGB} GB (rec)`, status: vramStatus },
    { label: 'RAM', you: userRam != null ? `${userRam} GB` : 'Unknown', need: `${min.ramGB} GB (min) / ${rec.ramGB} GB (rec)`, status: ramStatus },
    { label: 'OS', you: specs.os?.name || 'Unknown', need: min.os, status: osOk ? 'pass' : 'fail' },
    { label: 'Storage', you: storageFree != null ? `${storageFree} GB free` : 'Unknown', need: `${min.storageGB} GB`, status: storageStatus },
    { label: 'DirectX', you: specs.directx ? `DirectX ${specs.directx}` : 'Unknown', need: `DirectX ${min.directx}`, status: dxOk ? 'pass' : 'fail' },
  ]

  const hardFail = !osOk || !dxOk
  const gpuOrCpuUnknown = gpuStatus === 'unknown' || cpuStatus === 'unknown'

  let verdict
  if (gpuOrCpuUnknown && !hardFail) {
    verdict = 'insufficient-data'
  } else if (hardFail || gpuStatus === 'fail' || cpuStatus === 'fail') {
    verdict = 'not-recommended'
  } else if (gpuStatus === 'partial' || cpuStatus === 'partial' || ramStatus === 'partial' || vramStatus === 'partial') {
    verdict = 'playable-limited'
  } else {
    verdict = 'playable'
  }

  // Score is a weighted summary of the same comparison shown in the table —
  // never the sole basis for the verdict category above (weakest-component
  // rule owns that). Re-normalize weights over whichever components resolved.
  const parts = [
    { pct: gpuPct, w: WEIGHTS.gpu },
    { pct: cpuPct, w: WEIGHTS.cpu },
    { pct: ramPct, w: WEIGHTS.ram },
    { pct: vramPct, w: WEIGHTS.vram },
  ].filter((p) => p.pct != null)
  const totalW = parts.reduce((s, p) => s + p.w, 0)
  const score = totalW > 0 && !hardFail
    ? Math.round(parts.reduce((s, p) => s + p.pct * p.w, 0) / totalW)
    : hardFail ? Math.min(15, Math.round(parts.reduce((s, p) => s + p.pct * p.w, 0) / (totalW || 1)) || 0) : null

  const statusPriority = { fail: 0, partial: 1, unknown: 2, pass: 3 }
  const bottleneckCandidates = components.filter((c) => ['GPU', 'CPU', 'RAM', 'VRAM'].includes(c.label))
  const bottleneck = bottleneckCandidates
    .slice()
    .sort((a, b) => statusPriority[a.status] - statusPriority[b.status])[0]
  const bottleneckLabel = bottleneck && bottleneck.status !== 'pass' ? bottleneck.label : null

  return {
    verdict,
    score,
    components,
    bottleneck: bottleneckLabel,
    settingsBand: SETTINGS_BAND[verdict],
  }
}

export function verdictRank(verdict) {
  const idx = VERDICT_ORDER.indexOf(verdict)
  return idx === -1 ? -1 : idx
}
