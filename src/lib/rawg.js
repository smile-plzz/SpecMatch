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

// Drops expired specmatch:rawg:* entries so a quota error doesn't permanently
// disable caching for the rest of the session (see cacheSet's catch below).
function sweepExpiredCache() {
  const now = Date.now()
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(CACHE_PREFIX)) continue
    try {
      const { expiresAt } = JSON.parse(localStorage.getItem(key))
      if (now > expiresAt) localStorage.removeItem(key)
    } catch {
      localStorage.removeItem(key) // corrupt entry, drop it
    }
  }
}

function cacheSet(key, data) {
  const entry = JSON.stringify({ data, expiresAt: Date.now() + CACHE_TTL_MS })
  try {
    localStorage.setItem(CACHE_PREFIX + key, entry)
  } catch {
    try {
      sweepExpiredCache()
      localStorage.setItem(CACHE_PREFIX + key, entry)
    } catch {
      // still full after sweeping (all entries still live) — skip, not fatal
    }
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

export async function fetchGameScreenshots(id) {
  const data = await rawgFetch(`/games/${id}/screenshots`)
  return (data.results || []).map((s) => s.image).filter(Boolean)
}

export async function fetchGenres() {
  return rawgFetch('/genres')
}

// Requests a resized RAWG image variant instead of the full-resolution
// original. RAWG serves these via a path segment inserted after `/media/`:
// crop/{w}/{h}/... (fixed aspect, cropped) or resize/{w}/... (proportional).
export function rawgImage(url, { w, h, mode = 'crop' } = {}) {
  if (!url || !w) return url
  const size = mode === 'crop' && h ? `${w}/${h}` : `${w}`
  return url.replace('/media/', `/media/${mode}/${size}/`)
}

// Normalizes a RAWG game object into the shape the recommendation/scoring/UI
// layers expect, so RAWG's response shape can change without touching
// scoring.js or the components. Works with both list-endpoint objects (used
// by Discover's card grid) and detail-endpoint objects (used by the game
// detail modal, Library, Wishlist) — detail-only fields (description,
// developers, publishers, website, trailer) simply come back undefined when
// given list data, which callers must treat as "not loaded yet", not an error.
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
    storeLinks: (rawgGame.stores || [])
      .filter((s) => s.url)
      .map((s) => ({ url: s.url, name: s.store?.name ?? null })),
    // Free on both list and detail responses:
    metacritic: rawgGame.metacritic ?? null,
    esrbRating: rawgGame.esrb_rating?.name ?? null,
    playtime: rawgGame.playtime ?? null,
    // Detail-endpoint only — undefined on list data, filled in once
    // GameDetailModal fetches /games/{id} and re-runs this normalizer.
    description: rawgGame.description_raw,
    developers: rawgGame.developers?.map((d) => d.name),
    publishers: rawgGame.publishers?.map((p) => p.name),
    website: rawgGame.website,
    trailer: rawgGame.clip ? { url: rawgGame.clip.clip, poster: rawgGame.clip.preview } : undefined,
  }
}
