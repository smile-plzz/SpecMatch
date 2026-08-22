// Offline ingestion script — NOT called at runtime by the app. Fetches real
// min/recommended requirements from Steam's public appdetails endpoint and
// appends them to src/data/games.json in the schema the compatibility engine
// (src/lib/compatibility.js) expects.
//
// Steam's requirement fields are loosely-structured HTML that varies in
// formatting per publisher, so parsing is best-effort: every result prints
// what it parsed AND the raw HTML alongside it, so a human can spot-check
// before trusting the output. This deliberately does not auto-merge
// unreviewed entries into games.json — run with --write only after reviewing
// the dry-run output. Never invents a value it couldn't parse; leaves it
// null rather than guessing (matches the "no invented numbers" rule that
// applies to the whole product, not just the UI).
//
// Usage:
//   node scripts/fetch-steam-requirements.mjs            (dry run, prints parsed + raw)
//   node scripts/fetch-steam-requirements.mjs --write     (appends to games.json)

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const GAMES_PATH = path.join(__dirname, '../src/data/games.json')

// A deliberate spread: light indie, competitive/low-spec, mid-range, older
// classics, and current-gen AAA — not an attempt at "all games."
const CANDIDATES = [
  { appid: 367520, id: 'hollow-knight', title: 'Hollow Knight' },
  { appid: 105600, id: 'terraria', title: 'Terraria' },
  { appid: 730, id: 'counter-strike-2', title: 'Counter-Strike 2' },
  { appid: 252950, id: 'rocket-league', title: 'Rocket League' },
  { appid: 220, id: 'half-life-2', title: 'Half-Life 2' },
  { appid: 292030, id: 'the-witcher-3', title: 'The Witcher 3: Wild Hunt' },
  { appid: 1174180, id: 'red-dead-redemption-2', title: 'Red Dead Redemption 2' },
  { appid: 990080, id: 'hogwarts-legacy', title: 'Hogwarts Legacy' },
  { appid: 548430, id: 'deep-rock-galactic', title: 'Deep Rock Galactic' },
  { appid: 646570, id: 'slay-the-spire', title: 'Slay the Spire' },
]

function decodeEntities(str) {
  return str.replace(/&amp;/g, '&').replace(/&reg;/g, '').replace(/®/g, '').replace(/&nbsp;/g, ' ')
}

// Steam's own field labels vary game-to-game ("Video Card" vs "Graphics",
// "Hard Disk Space" vs "Storage") and whether the label and value share one
// <strong> tag or sit in separate ones — both forms are real, seen across
// the candidate list during implementation. Parsing per <li> block and
// splitting on the first colon in its PLAIN TEXT (after stripping all inner
// tags) handles both, instead of assuming one fixed HTML shape.
const LABEL_MAP = {
  os: 'os',
  'operating system': 'os',
  processor: 'cpu',
  cpu: 'cpu',
  'video card': 'gpu',
  graphics: 'gpu',
  'graphics card': 'gpu',
  memory: 'ram',
  ram: 'ram',
  'hard disk space': 'storage',
  storage: 'storage',
  directx: 'directx',
}

function parseRequirementBlock(html) {
  if (!html) return null
  const liBlocks = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => m[1])
  const fields = { os: null, cpu: null, gpu: null, ram: null, storage: null, directx: null }

  for (const block of liBlocks) {
    const plain = decodeEntities(block.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim()
    const colonIdx = plain.indexOf(':')
    if (colonIdx === -1) continue
    const label = plain.slice(0, colonIdx).trim().toLowerCase()
    const value = plain.slice(colonIdx + 1).trim()
    const key = LABEL_MAP[label]
    if (key && value) fields[key] = value
  }

  const ramGB = fields.ram ? Number((fields.ram.match(/(\d+(?:\.\d+)?)\s*GB/i) || [])[1]) || null : null
  const storageGB = fields.storage
    ? (fields.storage.match(/(\d+(?:\.\d+)?)\s*GB/i)
        ? Number(fields.storage.match(/(\d+(?:\.\d+)?)\s*GB/i)[1])
        : fields.storage.match(/(\d+)\s*MB/i) ? Math.max(1, Math.round(Number(fields.storage.match(/(\d+)\s*MB/i)[1]) / 1024)) : null)
    : null
  const directx = fields.directx ? (fields.directx.match(/(\d+)/) || [])[1] || null : null
  const vramGB = fields.gpu ? Number((fields.gpu.match(/(\d+(?:\.\d+)?)\s*GB/i) || [])[1]) || null : null

  return { os: fields.os, cpu: fields.cpu, gpu: fields.gpu, vramGB, ramGB, storageGB, directx }
}

async function fetchSteamRequirements(appid) {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us&l=en`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (SpecMatch dataset ingestion script)' } })
  if (!res.ok) throw new Error(`Steam API request failed: ${res.status}`)
  const data = await res.json()
  const entry = data[appid]
  if (!entry?.success) throw new Error('Steam API returned success:false (delisted, region-locked, or invalid appid)')
  const reqs = entry.data.pc_requirements
  return {
    releaseYear: entry.data.release_date?.date ? new Date(entry.data.release_date.date).getFullYear() || null : null,
    storeUrl: `https://store.steampowered.com/app/${appid}/`,
    minimum: parseRequirementBlock(reqs?.minimum),
    recommended: parseRequirementBlock(reqs?.recommended),
  }
}

function toGamesJsonEntry(candidate, fetched) {
  const clean = (block) => block && {
    os: block.os,
    cpu: block.cpu,
    gpu: block.gpu,
    vramGB: block.vramGB,
    ramGB: block.ramGB,
    storageGB: block.storageGB,
    directx: block.directx,
  }
  return {
    id: candidate.id,
    title: candidate.title,
    platform: ['Windows'],
    releaseYear: fetched.releaseYear,
    requirements: {
      minimum: clean(fetched.minimum),
      recommended: clean(fetched.recommended),
    },
    source: { name: 'Steam store page', url: fetched.storeUrl, retrievedAt: new Date().toISOString().slice(0, 10) },
  }
}

function isUsable(entry) {
  // Refuse to write an entry the compatibility engine can't actually score —
  // CPU/GPU are load-bearing fields (evaluateCompatibility needs both tiers
  // of both to avoid falling straight into "insufficient data").
  const req = entry.requirements
  return req.minimum?.cpu && req.minimum?.gpu && req.recommended?.cpu && req.recommended?.gpu
}

async function main() {
  const shouldWrite = process.argv.includes('--write')
  const existing = JSON.parse(readFileSync(GAMES_PATH, 'utf8'))
  const existingIds = new Set(existing.map((g) => g.id))

  const results = []
  for (const candidate of CANDIDATES) {
    if (existingIds.has(candidate.id)) {
      console.log(`SKIP  ${candidate.title} — already in games.json`)
      continue
    }
    try {
      const fetched = await fetchSteamRequirements(candidate.appid)
      const entry = toGamesJsonEntry(candidate, fetched)
      const usable = isUsable(entry)
      console.log(`\n${usable ? 'OK  ' : 'WARN'}  ${candidate.title} (appid ${candidate.appid})`)
      console.log('  minimum:    ', JSON.stringify({ ...entry.requirements.minimum }))
      console.log('  recommended:', JSON.stringify({ ...entry.requirements.recommended }))
      if (!usable) console.log('  -> missing CPU/GPU in one tier, will NOT be written even with --write')
      if (usable) results.push(entry)
    } catch (err) {
      console.log(`\nFAIL  ${candidate.title} (appid ${candidate.appid}): ${err.message}`)
    }
    await new Promise((r) => setTimeout(r, 400)) // be polite to Steam's unauthenticated endpoint
  }

  console.log(`\n${results.length} usable new entries parsed out of ${CANDIDATES.length} candidates.`)

  if (shouldWrite && results.length) {
    const merged = [...existing, ...results]
    writeFileSync(GAMES_PATH, JSON.stringify(merged, null, 2) + '\n')
    console.log(`Wrote ${results.length} new entries to ${GAMES_PATH}`)
  } else if (!shouldWrite) {
    console.log('Dry run only — re-run with --write to append the OK entries above to games.json.')
  }
}

main()
