import { GPU_TIERS, CPU_TIERS } from './specs'

// Deterministic compatibility scoring — no AI involved. Real official system
// requirements aren't available from a free API, so demand is estimated from
// genre/tags/release recency. This is intentionally transparent and overridable
// once a real requirements source is wired in; the Compare tab exists precisely
// so users can sanity-check these estimates against reality.

const HEAVY_GENRES = ['Action', 'Shooter', 'RPG', 'Massively Multiplayer', 'Racing']
const LIGHT_GENRES = ['Indie', 'Puzzle', 'Board Games', 'Card', 'Casual']
const HEAVY_TAGS = ['Open World', 'Ray Tracing', 'Unreal Engine 5', 'Souls-like', 'Battle Royale']

function yearsAgo(releaseDate) {
  if (!releaseDate) return 5 // unknown release → assume mid-age, avoid over/under-penalizing
  const years = (Date.now() - new Date(releaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  return Math.max(0, years)
}

function demandScore(game) {
  let score = 2 // baseline: "mid" demand
  const age = yearsAgo(game.released)
  if (age < 1) score += 1.5
  else if (age < 3) score += 0.5
  else if (age > 7) score -= 1

  for (const g of game.genres || []) {
    if (HEAVY_GENRES.includes(g)) score += 0.4
    if (LIGHT_GENRES.includes(g)) score -= 0.6
  }
  for (const t of game.tags || []) {
    if (HEAVY_TAGS.includes(t)) score += 0.5
  }
  return score
}

function tierFromScore(score, tiers) {
  const idx = Math.round(Math.min(tiers.length - 1, Math.max(0, score)))
  return tiers[idx]
}

const RAM_REQUIREMENT_GB = { integrated: 8, entry: 8, mid: 8, high: 16, enthusiast: 16 }

// FPS ranges are labeled ranges for the matching tier, not per-game benchmarks —
// same convention as the README's original tier table.
const FPS_RANGE = { smooth: '60+ FPS', playable: '30–45 FPS', poor: '<30 FPS' }

export function scoreGameForSpecs(game, specs) {
  const score = demandScore(game)
  const requiredGpuTier = tierFromScore(score, GPU_TIERS)
  const requiredCpuTier = tierFromScore(score - 0.5, CPU_TIERS) // CPU demand tracks slightly behind GPU demand

  const userGpuIdx = GPU_TIERS.indexOf(specs.gpu?.tier ?? 'mid')
  const userCpuIdx = CPU_TIERS.indexOf(specs.cpu?.tier ?? 'mid')
  const reqGpuIdx = GPU_TIERS.indexOf(requiredGpuTier)
  const reqCpuIdx = CPU_TIERS.indexOf(requiredCpuTier)
  const ramOk = (specs.ramGB ?? 8) >= RAM_REQUIREMENT_GB[requiredGpuTier]

  const gpuDelta = userGpuIdx - reqGpuIdx
  const cpuDelta = userCpuIdx - reqCpuIdx

  let tier
  if (gpuDelta >= 0 && cpuDelta >= 0 && ramOk) tier = 'smooth'
  else if (gpuDelta >= -1 && cpuDelta >= -1) tier = 'playable'
  else tier = 'poor'

  return {
    tier,
    fpsRange: FPS_RANGE[tier],
    requiredGpuTier,
    requiredCpuTier,
    ramOk,
  }
}

export function scoreAndRankGames(games, specs) {
  return games
    .map((game) => ({ game, score: scoreGameForSpecs(game, specs) }))
    .sort((a, b) => {
      const order = { smooth: 0, playable: 1, poor: 2 }
      return order[a.score.tier] - order[b.score.tier]
    })
}
