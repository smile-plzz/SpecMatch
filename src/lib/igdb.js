// Client for /api/igdb — the fallback game-data source used when RAWG fails
// or comes back empty (see PLAN.md Phase 5). Same normalized shape as
// src/lib/rawg.js's enrichGame() output, so callers don't need to care which
// source a game came from.

async function igdbRequest(body) {
  const res = await fetch('/api/igdb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `IGDB request failed (${res.status})`)
  return data
}

export async function fetchPopularGamesIgdb({ genre } = {}) {
  return igdbRequest({ type: 'popular', genre })
}

export async function searchGamesIgdb(query) {
  return igdbRequest({ type: 'search', search: query })
}

export async function fetchGameDetailsIgdb(id) {
  const data = await igdbRequest({ type: 'details', id })
  return data.results?.[0]
}
