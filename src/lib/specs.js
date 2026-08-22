// Hardware profile schema shared between browser auto-detect (Phase 0) and the
// desktop utility upload (Phase 1+). Every field is optional except `source` —
// callers should treat missing fields as "unknown", not zero.

export const CPU_TIERS = ['low', 'mid', 'high', 'enthusiast']
export const GPU_TIERS = ['integrated', 'entry', 'mid', 'high', 'enthusiast']

function detectGpuModel() {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return null
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    if (!ext) return null
    return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || null
  } catch {
    return null
  }
}

function guessCpuTier(cores) {
  if (!cores) return 'mid'
  if (cores <= 2) return 'low'
  if (cores <= 6) return 'mid'
  if (cores <= 12) return 'high'
  return 'enthusiast'
}

function guessGpuTier(rendererString) {
  const s = (rendererString || '').toLowerCase()
  if (!s) return 'mid'
  if (/(rtx 40|rtx 50|rx 7900|rx 9)/.test(s)) return 'enthusiast'
  if (/(rtx 30|rtx 20|gtx 16|rx 6[6-9]|rx 7[0-8])/.test(s)) return 'high'
  if (/(gtx 10|gtx 9|rx 5[0-6]|rx 6[0-5])/.test(s)) return 'mid'
  if (/(intel|uhd|iris|vega|apple m)/.test(s)) return 'integrated'
  return 'entry'
}

// Best-effort spec detection from the browser alone. Real GPU/CPU model, VRAM,
// DirectX level, and refresh rate are NOT available to JS — this is a rough
// preview only; the desktop utility (Phase 1) is the source of truth.
export function detectBrowserSpecs() {
  const cores = navigator.hardwareConcurrency || null
  const ramGB = navigator.deviceMemory || null // capped at 8 by spec, browser-side estimate only
  const gpuModel = detectGpuModel()
  const width = window.screen.width * (window.devicePixelRatio || 1)
  const height = window.screen.height * (window.devicePixelRatio || 1)

  return {
    source: 'browser',
    collectedAt: new Date().toISOString(),
    os: { name: guessOsName(), version: null, arch: null },
    cpu: { model: null, cores, threads: null, tier: guessCpuTier(cores) },
    gpu: { model: gpuModel, vramGB: null, tier: guessGpuTier(gpuModel) },
    ramGB,
    storage: { type: null, freeGB: null },
    display: { width, height, refreshHz: null },
    directx: null,
  }
}

function guessOsName() {
  const p = navigator.platform || navigator.userAgentData?.platform || ''
  if (/win/i.test(p)) return 'Windows'
  if (/mac/i.test(p)) return 'macOS'
  if (/linux/i.test(p)) return 'Linux'
  return null
}

// Validates + normalizes a hardware report uploaded from the desktop utility
// (Phase 1). Rejects unknown top-level keys and enforces size/type sanity so a
// malformed or malicious upload can't reach the scoring/AI pipeline.
//
// `reportVersion` was added for the pivot (DESIGN_HANDOFF.md §9): the utility
// itself hasn't been updated to emit it yet, so its absence is treated as v1
// (today's shape) rather than an error — this keeps existing report.json
// files from suddenly failing validation. Bump `CURRENT_REPORT_VERSION` and
// branch here if a future field addition needs real migration logic.
// v3 (collect-specs.ps1's current output) adds richer nested data —
// per-adapter GPU list with integrated/discrete classification, per-field
// confidence flags, form-factor (laptop/battery) detection, and a
// directxInfo object. It keeps the same flat `gpu`/`ramGB`/`directx` fields
// v1/v2 consumers (the compatibility engine, SpecPanel, rig-card) already
// read, specifically so none of that code needed to change for the schema
// bump — the extra v3 fields are additive, read only by callers that ask
// for them (e.g. a future "integrated GPU also detected" note).
const CURRENT_REPORT_VERSION = '3.0'
const SUPPORTED_VERSIONS = ['1.0', '2.0', '3.0']
const ALLOWED_KEYS = [
  'reportVersion', 'source', 'collectedAt', 'os', 'cpu', 'gpu', 'integratedGpu',
  'gpus', 'ram', 'ramGB', 'storage', 'display', 'directx', 'directxInfo', 'formFactor',
]

export function parseUtilityReport(json) {
  if (!json || typeof json !== 'object') throw new Error('Invalid report: not an object')
  const keys = Object.keys(json)
  const unknown = keys.filter((k) => !ALLOWED_KEYS.includes(k))
  if (unknown.length) throw new Error(`Invalid report: unexpected fields ${unknown.join(', ')}`)
  if (json.reportVersion && !SUPPORTED_VERSIONS.includes(json.reportVersion)) {
    throw new Error(`Invalid report: unsupported reportVersion "${json.reportVersion}"`)
  }

  return {
    reportVersion: json.reportVersion || '1.0',
    source: 'utility',
    collectedAt: json.collectedAt || new Date().toISOString(),
    os: json.os || { name: null, version: null, arch: null },
    cpu: {
      model: json.cpu?.model || null,
      manufacturer: json.cpu?.manufacturer || null,
      cores: json.cpu?.cores || null,
      threads: json.cpu?.threads || null,
      baseClockMHz: json.cpu?.baseClockMHz || null,
      architecture: json.cpu?.architecture || null,
      tier: guessCpuTier(json.cpu?.cores),
      confidence: json.cpu?.confidence || (json.cpu?.model ? 'high' : 'unknown'),
    },
    gpu: {
      model: json.gpu?.model || null,
      vendor: json.gpu?.vendor || null,
      integrated: json.gpu?.integrated ?? null,
      vramGB: json.gpu?.vramGB || null,
      driverVersion: json.gpu?.driverVersion || null,
      tier: guessGpuTier(json.gpu?.model),
      confidence: json.gpu?.confidence || (json.gpu?.model ? 'high' : 'unknown'),
    },
    // v3 only — null on v1/v2 reports, which is correct (they never
    // distinguished a second adapter at all).
    integratedGpu: json.integratedGpu || null,
    gpus: json.gpus || null,
    ram: json.ram || null,
    ramGB: json.ramGB || json.ram?.totalGB || null,
    storage: json.storage || { type: null, freeGB: null },
    display: json.display || { width: null, height: null, refreshHz: null },
    directx: json.directx || json.directxInfo?.version || null,
    directxInfo: json.directxInfo || null,
    formFactor: json.formFactor || null,
  }
}

// Builds the same profile shape from the manual-entry form (Upload screen's
// "Enter manually" tab) so downstream code (compatibility engine, SpecPanel,
// sidebar rig-card) never has to special-case how a profile was produced.
export function buildManualSpecs({ osName, cpuModel, gpuModel, ramGB, vramGB, directx }) {
  return {
    reportVersion: CURRENT_REPORT_VERSION,
    source: 'manual',
    collectedAt: new Date().toISOString(),
    os: { name: osName || null, version: null, arch: null },
    cpu: { model: cpuModel || null, cores: null, threads: null, tier: guessCpuTier(null) },
    gpu: { model: gpuModel || null, vramGB: vramGB || null, tier: guessGpuTier(gpuModel) },
    ramGB: ramGB || null,
    storage: { type: null, freeGB: null },
    display: { width: null, height: null, refreshHz: null },
    directx: directx || null,
  }
}
