// Thin client for the /api/recommend serverless function (see api/recommend.js).
// The Mistral key never reaches the browser — this only talks to our own
// same-origin endpoint.

export async function getAiRecommendations(specs, rankedCandidates) {
  const candidates = rankedCandidates.map(({ game, score }) => ({
    id: game.id,
    title: game.title,
    genres: game.genres,
    tags: game.tags,
    released: game.released,
    score,
  }))

  const res = await fetch('/api/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ specs, candidates }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `AI request failed (${res.status})`)
  return data
}
