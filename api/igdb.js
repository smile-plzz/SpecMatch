// IGDB proxy — fallback game-data source if RAWG has gaps (see PLAN.md Phase 5).
// IGDB's OAuth client_secret must never reach the browser, so this function is
// the only thing that talks to Twitch/IGDB. Only three fixed request shapes
// are accepted from the client (popular/search/details) — no raw Apicalypse
// query passthrough, so our credentials can't be used as an open proxy for
// arbitrary IGDB queries.

import { checkRateLimit, getClientIp } from '../src/lib/rateLimit.js'

const TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
const IGDB_URL = 'https://api.igdb.com/v4/games'
const RATE_LIMIT = { limit: 30, windowMs: 60 * 1000 } // 30 req/min/IP

let cachedToken = null // { accessToken, expiresAt } — persists across warm invocations only

async function getAppToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.accessToken

  const url = new URL(TOKEN_URL)
  url.searchParams.set('client_id', process.env.IGDB_CLIENT_ID)
  url.searchParams.set('client_secret', process.env.IGDB_CLIENT_SECRET)
  url.searchParams.set('grant_type', 'client_credentials')

  const res = await fetch(url, { method: 'POST' })
  if (!res.ok) throw new Error(`Twitch token request failed (${res.status})`)
  const data = await res.json()
  cachedToken = { accessToken: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 }
  return cachedToken.accessToken
}

const FIELDS_LIST = 'name,cover.url,rating,first_release_date,genres.name,keywords.name,platforms.name,url'
// Detail-only fields, kept off the list/search queries to keep those fast/cheap:
const FIELDS_DETAIL =
  FIELDS_LIST +
  ',summary,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,' +
  'screenshots.url,videos.video_id,websites.url,aggregated_rating'

function buildQuery({ type, genre, search, id }) {
  switch (type) {
    case 'popular':
      return `fields ${FIELDS_LIST}; where rating != null${genre ? ` & genres.slug = "${genre}"` : ''}; sort rating desc; limit 40;`
    case 'search':
      return `fields ${FIELDS_LIST}; search "${search}"; limit 20;`
    case 'details':
      return `fields ${FIELDS_DETAIL}; where id = ${Number(id)};`
    default:
      throw new Error('Invalid request type')
  }
}

function normalize(igdbGame, { detail = false } = {}) {
  const companies = igdbGame.involved_companies || []
  const base = {
    id: igdbGame.id,
    title: igdbGame.name,
    background: igdbGame.cover?.url ? `https:${igdbGame.cover.url.replace('t_thumb', 't_1080p')}` : null,
    rating: igdbGame.rating != null ? Math.round(igdbGame.rating) / 20 : null, // IGDB is 0-100, normalize to RAWG's 0-5
    released: igdbGame.first_release_date ? new Date(igdbGame.first_release_date * 1000).toISOString().slice(0, 10) : null,
    genres: (igdbGame.genres || []).map((g) => g.name),
    tags: (igdbGame.keywords || []).slice(0, 6).map((k) => k.name),
    platforms: (igdbGame.platforms || []).map((p) => p.name),
    storeLinks: igdbGame.url ? [{ url: igdbGame.url, name: 'IGDB' }] : [],
  }
  if (!detail) return base
  return {
    ...base,
    description: igdbGame.summary ?? null,
    developers: companies.filter((c) => c.developer).map((c) => c.company?.name).filter(Boolean),
    publishers: companies.filter((c) => c.publisher).map((c) => c.company?.name).filter(Boolean),
    metacritic: igdbGame.aggregated_rating != null ? Math.round(igdbGame.aggregated_rating) : null,
    website: igdbGame.websites?.[0]?.url ?? null,
    trailer: igdbGame.videos?.[0]
      ? { url: `https://www.youtube.com/watch?v=${igdbGame.videos[0].video_id}`, poster: null }
      : undefined,
    screenshots: (igdbGame.screenshots || []).map((s) => `https:${s.url.replace('t_thumb', 't_screenshot_big')}`),
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const ip = getClientIp(req)
  const rate = checkRateLimit(`igdb:${ip}`, RATE_LIMIT)
  if (!rate.allowed) {
    res.status(429).json({ error: 'Too many requests — try again shortly' })
    return
  }

  const { type, genre, search, id } = req.body || {}
  if (!['popular', 'search', 'details'].includes(type)) {
    res.status(400).json({ error: 'type must be one of: popular, search, details' })
    return
  }
  if (type === 'search' && (!search || typeof search !== 'string')) {
    res.status(400).json({ error: 'search is required for type=search' })
    return
  }
  if (type === 'details' && !id) {
    res.status(400).json({ error: 'id is required for type=details' })
    return
  }

  if (!process.env.IGDB_CLIENT_ID || !process.env.IGDB_CLIENT_SECRET) {
    res.status(500).json({ error: 'Server is not configured with IGDB credentials' })
    return
  }

  try {
    const token = await getAppToken()
    const igdbRes = await fetch(IGDB_URL, {
      method: 'POST',
      headers: {
        'Client-ID': process.env.IGDB_CLIENT_ID,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body: buildQuery({ type, genre, search, id }),
    })

    if (!igdbRes.ok) {
      const detail = await igdbRes.text().catch(() => '')
      res.status(502).json({ error: `IGDB request failed (${igdbRes.status})`, detail })
      return
    }

    const games = await igdbRes.json()
    res.status(200).json({ results: games.map((g) => normalize(g, { detail: type === 'details' })) })
  } catch (err) {
    res.status(502).json({ error: 'IGDB call failed', detail: err.message })
  }
}
