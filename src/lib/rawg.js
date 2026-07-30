const RAWG_BASE = 'https://api.rawg.io/api'
const RAWG_KEY = import.meta.env.VITE_RAWG_KEY
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours, per README's rate-limit strategy
const CACHE_PREFIX = 'specmatch:rawg:'

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const { data, expiresAt } = JSON.parse(raw)
    if (Date.now() > expiresAt) {
      localStorage.removeItem(CACHE_PREFIX + key)
      return null
    }
    return data
  } catch {
    return null
  }
}

function cacheSet(key, data) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data, expiresAt: Date.now() + CACHE_TTL_MS })
    )
  } catch {
    // localStorage full/unavailable — skip caching, not fatal
  }
}

async function rawgFetch(path, params = {}) {
  const cacheKey = path + JSON.stringify(params)
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const url = new URL(RAWG_BASE + path)
  url.searchParams.set('key', RAWG_KEY)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v)
  }

  const res = await fetch(url)
  if (!res.ok) throw new Error(`RAWG request failed: ${res.status}`)
  const data = await res.json()
  cacheSet(cacheKey, data)
  return data
}

export async function fetchPopularGames({ page = 1, pageSize = 40, genres, ordering = '-rating' } = {}) {
  return rawgFetch('/games', { page, page_size: pageSize, genres, ordering })
}

export async function searchGames(query) {
  return rawgFetch('/games', { search: query, page_size: 20 })
}

export async function fetchGameDetails(id) {
  return rawgFetch(`/games/${id}`)
}

export async function fetchGenres() {
  return rawgFetch('/genres')
}

// Normalizes a RAWG game object into the shape the recommendation/scoring
// pipeline expects, so RAWG's response shape can change without touching
// scoring.js or the UI components.
export function enrichGame(rawgGame) {
  return {
    id: rawgGame.id,
    title: rawgGame.name,
    background: rawgGame.background_image,
    rating: rawgGame.rating,
    released: rawgGame.released,
    genres: (rawgGame.genres || []).map((g) => g.name),
    tags: (rawgGame.tags || []).slice(0, 6).map((t) => t.name),
    platforms: (rawgGame.platforms || []).map((p) => p.platform.name),
    storeLinks: (rawgGame.stores || []).map((s) => s.url).filter(Boolean),
  }
}
