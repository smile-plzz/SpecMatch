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
const ALLOWED_KEYS = ['source', 'collectedAt', 'os', 'cpu', 'gpu', 'ramGB', 'storage', 'display', 'directx']

export function parseUtilityReport(json) {
  if (!json || typeof json !== 'object') throw new Error('Invalid report: not an object')
  const keys = Object.keys(json)
  const unknown = keys.filter((k) => !ALLOWED_KEYS.includes(k))
  if (unknown.length) throw new Error(`Invalid report: unexpected fields ${unknown.join(', ')}`)

  return {
    source: 'utility',
    collectedAt: json.collectedAt || new Date().toISOString(),
    os: json.os || { name: null, version: null, arch: null },
    cpu: {
      model: json.cpu?.model || null,
      cores: json.cpu?.cores || null,
      threads: json.cpu?.threads || null,
      tier: guessCpuTier(json.cpu?.cores),
    },
    gpu: {
      model: json.gpu?.model || null,
      vramGB: json.gpu?.vramGB || null,
      tier: guessGpuTier(json.gpu?.model),
    },
    ramGB: json.ramGB || null,
    storage: json.storage || { type: null, freeGB: null },
    display: json.display || { width: null, height: null, refreshHz: null },
    directx: json.directx || null,
  }
}
