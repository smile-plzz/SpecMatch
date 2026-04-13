# SPECMATCH — PC Game Recommender

Find games that run perfectly on your PC. Hardware-aware game recommendations powered by RAWG API and Claude AI.

---

## Features

- **Auto PC Detection** — reads CPU cores, device memory, and OS from the browser
- **Manual spec editing** — set your exact GPU tier, RAM, OS for precise matching
- **3-tier recommendations** — Runs Smoothly / Playable / Not Recommended
- **Mood filters** — Chill, Intense, Social, Story-Rich, Explore, Quick Play
- **AI suggestions** — "Because you liked..." powered by Claude API
- **Personal library** — track played, liked, disliked games
- **Wishlist** — save games to play later
- **Compare tool** — side-by-side PC vs game requirements
- **Dark / Light theme** — with system preference detection
- **PWA** — installable from browser, works offline after first load
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

---

## API Keys

### RAWG (required)
1. Go to https://rawg.io/apidocs
2. Sign up for a free account
3. Copy your API key
4. Add to `.env`: `VITE_RAWG_KEY=your_key_here`

The free RAWG tier gives 500,000 requests/month — more than enough.

### Claude / Anthropic (optional — for AI recommendations)
1. Go to https://console.anthropic.com
2. Create an API key
3. Add to `.env`: `VITE_ANTHROPIC_KEY=your_key_here`

> **Security note**: For production, route the Anthropic key through a serverless function (e.g. `api/recommend.js` on Vercel) rather than exposing it client-side. The current implementation calls the API directly from the browser, which is fine for personal/demo use.

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
   - `VITE_ANTHROPIC_KEY` = your Anthropic key (optional)
5. Click **Deploy**

Vercel auto-detects Vite and sets `npm run build` + `dist/` automatically.

---

## Project Structure

```
specmatch/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── GameCard.jsx          # Individual game card with action buttons
│   │   ├── GameDetailModal.jsx   # Full game detail + compatibility table
│   │   ├── Onboarding.jsx        # 3-step first-run setup flow
│   │   ├── SpecPanel.jsx         # PC specs display + edit modal
│   │   └── Toast.jsx             # Notification toast
│   ├── hooks/
│   │   └── useToast.js           # Toast state hook
│   ├── lib/
│   │   ├── aiRecs.js             # Claude API AI recommendations
│   │   ├── rawg.js               # RAWG API + caching + game enrichment
│   │   ├── specs.js              # PC detection + GPU tier logic
│   │   └── store.js              # localStorage library/wishlist/prefs
│   ├── pages/
│   │   ├── Compare.jsx           # PC vs game requirements comparison
│   │   ├── Discover.jsx          # Main recommendations + filters + mood
│   │   ├── Library.jsx           # Played/liked/disliked games
│   │   └── Wishlist.jsx          # Saved games
│   ├── styles/
│   │   └── globals.css           # Full design system + dark/light themes
│   ├── App.jsx                   # Root component + state management
│   └── main.jsx                  # Entry point
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── vercel.json
└── vite.config.js
```

---

## Recommendation Engine

Performance tiers are calculated by comparing your specs against estimated game requirements:

| Tier | GPU | RAM | Result |
|------|-----|-----|--------|
| ✅ Smooth | ≥ recommended | ≥ recommended | 60+ FPS |
| ⚠️ Playable | ≥ minimum | ≥ minimum | 30–45 FPS |
| ❌ Poor | < minimum | < minimum | <30 FPS |

Requirements are estimated from: game genre, release year, and genre tags. Not sourced from official specs — use the Compare tab to cross-reference.

---

## Roadmap / Future Ideas

- [ ] Vercel serverless function to proxy Anthropic key securely
- [ ] Steam library import via Steam Web API
- [ ] IGDB as a fallback/secondary API
- [ ] User auth (Supabase or Firebase) for cloud-synced library
- [ ] Price tracking integration (IsThereAnyDeal API)
- [ ] Benchmark score input (Cinebench, UserBenchmark)
- [ ] "Similar specs" community section

---

## License

MIT
