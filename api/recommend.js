// Single Mistral call per request. Deterministic scoring already happened
// client-side (src/lib/scoring.js) — this function only adds the natural
// language layer (explanations, hidden-gem picks, upgrade advice, profile
// summary) on top of specs + already-ranked candidates. Keeping this to one
// call is a deliberate architecture choice: cheap, fast, fits well inside
// Vercel Hobby's 10s function timeout (see PLAN.md).

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions'
const MAX_CANDIDATES = 15
const MAX_BODY_BYTES = 32 * 1024

const ALLOWED_SPEC_KEYS = ['source', 'collectedAt', 'os', 'cpu', 'gpu', 'ramGB', 'storage', 'display', 'directx']
const TIERS = ['smooth', 'playable', 'poor']

function validateSpecs(specs) {
  if (!specs || typeof specs !== 'object') throw new Error('specs missing or invalid')
  const unknown = Object.keys(specs).filter((k) => !ALLOWED_SPEC_KEYS.includes(k))
  if (unknown.length) throw new Error(`specs has unexpected fields: ${unknown.join(', ')}`)
}

function validateCandidates(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error('candidates must be a non-empty array')
  }
  if (candidates.length > MAX_CANDIDATES) {
    throw new Error(`too many candidates (max ${MAX_CANDIDATES})`)
  }
  for (const c of candidates) {
    if (!c.id || !c.title || !c.score || !TIERS.includes(c.score.tier)) {
      throw new Error('each candidate needs id, title, and a scored tier')
    }
  }
}

function buildPrompt(specs, candidates) {
  const specSummary = {
    gpu: specs.gpu?.model || `~${specs.gpu?.tier} tier`,
    cpu: specs.cpu?.model || `${specs.cpu?.cores || '?'} cores (~${specs.cpu?.tier} tier)`,
    ramGB: specs.ramGB,
    os: specs.os?.name,
  }
  const gameSummaries = candidates.map((c) => ({
    id: c.id,
    title: c.title,
    genres: c.genres,
    tags: c.tags,
    released: c.released,
    tier: c.score.tier,
    fpsRange: c.score.fpsRange,
  }))

  return [
    {
      role: 'system',
      content:
        'You are a PC gaming hardware advisor. You are given a hardware profile and a ' +
        'pre-scored, pre-ranked list of candidate games (tier and estimated FPS were computed ' +
        'deterministically already — do not contradict or re-estimate them). Reply with ONLY a ' +
        'JSON object matching this exact shape, no prose outside the JSON: ' +
        '{"profileSummary": string, "games": {"<gameId>": {"explanation": string, "hiddenGem": boolean}}, ' +
        '"upgradeSuggestions": [{"budget": "budget"|"mid"|"high", "suggestion": string}]}. ' +
        'profileSummary is one sentence describing what this PC is good for. Each game explanation is ' +
        '1-2 sentences on why it fits (or barely fits) this hardware, referencing its given tier/FPS. ' +
        'Mark hiddenGem true only for well-rated but less mainstream picks. upgradeSuggestions should have ' +
        'exactly 3 entries (budget/mid/high), each one concrete upgrade with its expected impact.',
    },
    {
      role: 'user',
      content: JSON.stringify({ hardware: specSummary, games: gameSummaries }),
    },
  ]
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const bodySize = Buffer.byteLength(JSON.stringify(req.body || {}))
  if (bodySize > MAX_BODY_BYTES) {
    res.status(413).json({ error: 'Request body too large' })
    return
  }

  const { specs, candidates } = req.body || {}
  try {
    validateSpecs(specs)
    validateCandidates(candidates)
  } catch (err) {
    res.status(400).json({ error: err.message })
    return
  }

  const apiKey = process.env.MISTRAL_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Server is not configured with a Mistral API key' })
    return
  }

  try {
    const mistralRes = await fetch(MISTRAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: buildPrompt(specs, candidates),
        response_format: { type: 'json_object' },
        temperature: 0.4,
      }),
    })

    if (!mistralRes.ok) {
      const detail = await mistralRes.text().catch(() => '')
      res.status(502).json({ error: `Mistral request failed (${mistralRes.status})`, detail })
      return
    }

    const data = await mistralRes.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      res.status(502).json({ error: 'Mistral returned no content' })
      return
    }

    const parsed = JSON.parse(content)
    res.status(200).json(parsed)
  } catch (err) {
    res.status(502).json({ error: 'Mistral call failed', detail: err.message })
  }
}
