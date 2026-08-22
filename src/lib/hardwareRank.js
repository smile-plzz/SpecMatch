// Ranked CPU/GPU reference tables, weakest to strongest, used to compare a
// user's component against a game's stated requirement by relative gaming
// performance tier — not by regex-guessing a coarse tier bucket from a model
// string (that's what `specs.js`'s guessCpuTier/guessGpuTier still do for the
// legacy heuristic scorer in `scoring.js`; this table is deliberately separate
// and is what the new compatibility engine in `compatibility.js` uses).
//
// Coverage is deliberately small and Windows/desktop-gaming-focused to match
// the curated game dataset (`src/data/games.json`). Entries are matched by
// case-insensitive substring against a free-text CPU/GPU model string, so more
// specific entries (e.g. "rtx 3060 ti") must be listed after their less
// specific prefix ("rtx 3060") — matching picks the longest matching entry.
//
// This list is illustrative, not exhaustive or independently benchmarked; it
// needs periodic expansion as new hardware generations ship and should be
// reviewed against real relative-performance data before being treated as
// authoritative (flagged in the pivot's deviation report).

export const GPU_RANK = [
  'intel uhd', 'intel hd', 'intel iris xe', 'apple m1', 'vega 8', 'vega 11',
  'gtx 1050', 'gtx 1050 ti', 'gtx 1650', 'rx 570', 'rx 580',
  'gtx 1060', 'gtx 1660', 'gtx 1660 super', 'gtx 1660 ti', 'rx 590',
  'gtx 1070', 'rx 5600 xt', 'rtx 2060',
  'gtx 1070 ti', 'gtx 1080', 'rx 5700', 'rtx 3050',
  'rx 5700 xt', 'rtx 2060 super', 'rtx 2070',
  'gtx 1080 ti', 'rtx 2070 super', 'rtx 3060',
  'rx 6600', 'rx 6600 xt', 'rtx 2080',
  'rtx 2080 super', 'rtx 3060 ti', 'rx 6700 xt',
  'rtx 2080 ti', 'rtx 3070', 'rx 6750 xt',
  'rtx 3070 ti', 'rx 6800', 'rtx 4060',
  'rx 6800 xt', 'rtx 3080', 'rtx 4060 ti',
  'rx 6900 xt', 'rtx 3080 ti', 'rx 7800 xt', 'rtx 4070',
  'rtx 3090', 'rtx 3090 ti', 'rtx 4070 super', 'rx 7900 xt',
  'rtx 4070 ti', 'rtx 4070 ti super', 'rx 7900 xtx',
  'rtx 4080', 'rtx 4080 super',
  'rtx 4090',
]

export const CPU_RANK = [
  'i3-8100', 'ryzen 3 1200', 'i3-10100', 'ryzen 3 3100',
  'i5-7400', 'ryzen 5 1600', 'i5-8400', 'ryzen 5 2600',
  'i5-9400', 'ryzen 5 2600x', 'i7-7700', 'ryzen 5 3600',
  'i5-9600k', 'ryzen 7 2700x', 'i5-10400', 'i7-8700',
  'ryzen 5 5600', 'i5-11400', 'i7-9700k', 'ryzen 7 3700x',
  'i5-12400', 'ryzen 5 5600x', 'i7-10700k', 'ryzen 7 5700x',
  'i5-13400', 'i7-11700k', 'ryzen 7 5800x',
  'i7-12700k', 'ryzen 9 5900x', 'ryzen 7 5800x3d',
  'i7-13700k', 'ryzen 7 7700x', 'i9-12900k',
  'i9-13900k', 'ryzen 9 7900x', 'ryzen 9 7950x',
]

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9\s.]/g, ' ').replace(/\s+/g, ' ').trim()
}

function findRank(modelString, table) {
  const s = normalize(modelString)
  if (!s) return null
  let bestIdx = null
  let bestLen = 0
  table.forEach((entry, idx) => {
    if (s.includes(entry) && entry.length > bestLen) {
      bestIdx = idx
      bestLen = entry.length
    }
  })
  return bestIdx
}

// Returns an integer rank (higher = stronger) or null if the model string
// didn't match anything in the table — callers must treat null as "unknown",
// never as rank 0, since that would silently mis-score real hardware as the
// weakest possible tier.
export function rankGpu(modelString) {
  return findRank(modelString, GPU_RANK)
}

export function rankCpu(modelString) {
  return findRank(modelString, CPU_RANK)
}

// A requirement string often lists two options ("i5-8400 / Ryzen 5 2600") —
// rank each candidate and take the weaker one's index only if BOTH resolve;
// if only one resolves, use that one (better partial information than none).
export function rankRequirementString(str, table) {
  if (!str) return null
  const parts = str.split('/').map((p) => findRank(p, table)).filter((r) => r !== null)
  if (!parts.length) return null
  return Math.min(...parts)
}
