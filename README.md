# SPECMATCH — PC Game Recommender

Find games that run perfectly on your PC. Hardware-aware game recommendations
powered by a real hardware scan, RAWG's game database, and Mistral AI.

See `PLAN.md` for the full pivot architecture, locked-in decisions, and phase
status.

---

## How it works

1. Run the desktop scan utility (`utility/collect-specs.ps1`, Windows) — reads
   real CPU/GPU model, VRAM, RAM, storage, display, and DirectX version via
   built-in CIM/WMI. No PII collected, nothing uploaded automatically.
2. Upload the `report.json` it writes on the SpecMatch site (or use the rougher
   in-browser estimate if you'd rather skip the utility).
3. Games are ranked against your specs **deterministically** (no AI) — genre/
   release-year/tag-based demand estimate vs. your GPU/CPU/RAM tier.
4. Optionally click **Get AI insights** — one Mistral API call (server-side,
   via `/api/recommend`) adds natural-language explanations, hidden-gem picks,
   and budget-tiered upgrade suggestions on top of the already-ranked list.

---

## Features

- **Desktop hardware scan** (Windows) — real GPU/CPU model, VRAM, DirectX
  level, resolution/refresh rate; browser-only estimate as a fallback
- **Manual spec editing** — override any detected/scanned value
- **3-tier recommendations** — Runs Smoothly / Playable / Not Recommended
- **Mood filters** — Chill, Intense, Social, Story-Rich, Explore, Quick Play
- **AI insights** — one Mistral call for profile summary, per-game
  explanations, hidden gems, and upgrade advice (opt-in button, not automatic)
- **Personal library** — track played, liked, disliked games
- **Wishlist** — save games to play later
- **Compare tool** — side-by-side PC vs game requirements
- **Dark / Light theme**
- **PWA** — installable, works offline after first load
- **API response caching** — 6-hour localStorage cache to stay under RAWG rate limits

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env and add your RAWG API key

# 3. Run locally
npm run dev

# 4. Build for production
npm run build
```

To scan a real Windows PC instead of using the browser estimate:

```powershell
powershell -ExecutionPolicy Bypass -File utility/collect-specs.ps1
```

Then upload the `report.json` it writes from the onboarding screen or the
spec panel's "Upload new scan report" button.

---

## API Keys

### RAWG (required, client-side)
1. Go to https://rawg.io/apidocs
2. Sign up for a free account
3. Copy your API key
4. Add to `.env`: `VITE_RAWG_KEY=your_key_here`

The free RAWG tier gives 500,000 requests/month — more than enough.

### Mistral (optional — for AI insights, server-side only)
1. Go to https://console.mistral.ai
2. Create an API key
3. Set it as a **server-side** environment variable named `MISTRAL_API_KEY`
   (Vercel dashboard, or a local `.env` read by `vercel dev`) — **not**
   prefixed with `VITE_`, since it must never reach the browser bundle.

`api/recommend.js` is the only thing that calls Mistral, and it's the only
place the key lives.

### IGDB (optional — fallback game-data source, server-side only)
Used only if RAWG errors or returns nothing. Register a Twitch app at
https://dev.twitch.tv/console/apps (free, self-serve, no approval wait) and
set `IGDB_CLIENT_ID` / `IGDB_CLIENT_SECRET` as server-side environment
variables — same rule as Mistral's key, never `VITE_`-prefixed.
`api/igdb.js` is the only thing that talks to Twitch/IGDB; it only accepts
three fixed request shapes (popular/search/details), not arbitrary queries,
so it can't be used as an open proxy for our credentials.

---

## Deploy to Vercel

### Option A — Vercel CLI
```bash
npm install -g vercel
vercel
# Follow prompts, set environment variables when asked
```

### Option B — GitHub + Vercel Dashboard
1. Push this repo to GitHub
2. Go to https://vercel.com/new
3. Import your GitHub repo
4. Under **Environment Variables**, add:
   - `VITE_RAWG_KEY` = your RAWG key
   - `MISTRAL_API_KEY` = your Mistral key (optional, server-side only)
   - `IGDB_CLIENT_ID` / `IGDB_CLIENT_SECRET` = your Twitch app credentials (optional, server-side only)
5. Click **Deploy**

Vercel auto-detects Vite and sets `npm run build` + `dist/` automatically, and
picks up `api/recommend.js` as a serverless function.

---

## Project Structure

```
specmatch/
├── api/
│   ├── recommend.js              # Single Mistral call — server-side only
│   └── igdb.js                   # IGDB proxy (fallback game data) — server-side only
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── AIInsights.jsx        # Profile summary + upgrade suggestions
│   │   ├── GameCard.jsx          # Individual game card with action buttons
│   │   ├── GameDetailModal.jsx   # Full game detail + compatibility table
│   │   ├── Onboarding.jsx        # First-run setup: upload scan or browser estimate
│   │   ├── SpecPanel.jsx         # PC specs display + edit/rescan
│   │   ├── UploadReport.jsx      # report.json file picker + validation
│   │   └── Toast.jsx             # Notification toast
│   ├── hooks/
│   │   └── useToast.js           # Toast state hook
│   ├── lib/
│   │   ├── igdb.js                # Client for /api/igdb (fallback game data)
│   │   ├── mistral.js            # Client for /api/recommend
│   │   ├── rateLimit.js          # Shared in-memory rate limiter for api/*.js
│   │   ├── rawg.js               # RAWG API + caching + game enrichment
│   │   ├── scoring.js            # Deterministic compatibility/FPS scoring
│   │   ├── specs.js              # Hardware schema, browser detect, report parsing
│   │   └── store.js              # localStorage library/wishlist/prefs
│   ├── pages/
│   │   ├── Compare.jsx           # PC vs game requirements comparison
│   │   ├── Discover.jsx          # Main recommendations + filters + mood + AI
│   │   ├── Library.jsx           # Played/liked/disliked games
│   │   └── Wishlist.jsx          # Saved games
│   ├── styles/
│   │   └── globals.css           # Design system + dark/light themes
│   ├── App.jsx                   # Root component + state management
│   └── main.jsx                  # Entry point
├── utility/
│   ├── collect-specs.ps1         # Windows hardware scan (CIM/WMI, no PII)
│   ├── build-exe.ps1             # Compiles it to collect-specs.exe via ps2exe
│   └── README.md
├── .env.example
├── .gitignore
├── PLAN.md                       # Pivot roadmap + status
├── index.html
├── package.json
├── vercel.json
└── vite.config.js
```

---

## Recommendation Engine

Performance tiers are calculated deterministically by comparing your specs
against an estimated game demand score:

| Tier | GPU/CPU vs. required tier | RAM | Result |
|------|---------------------------|-----|--------|
| ✅ Smooth | at or above | sufficient | 60+ FPS |
| ⚠️ Playable | up to one tier below | — | 30–45 FPS |
| ❌ Poor | more than one tier below | — | <30 FPS |

Demand is estimated from genre, release recency, and tags (open world, ray
tracing, etc.) — not sourced from official system requirements, since no free
API publishes those at scale. Use the Compare tab to sanity-check any specific
game. AI insights (when enabled) explain these numbers in plain language but
never override them.

---

## Roadmap / Future Ideas

See `PLAN.md` for the actively-tracked phase plan. Longer-term ideas not yet
scheduled:

- [ ] Steam library import via Steam Web API
- [ ] macOS/Linux scan utility (Rust rewrite of the same JSON schema)
- [ ] User auth (Supabase or Firebase) for cloud-synced library
- [ ] Price tracking integration (IsThereAnyDeal API)

---

## License

MIT
