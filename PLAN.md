# SpecMatch Pivot — Roadmap & Status

AI hardware-aware game recommender. Full architecture rationale in the original
plan doc (outside this repo, on the machine that built it):
`~/.claude/plans/vectorized-wandering-dawn.md`. This file is the in-repo mirror
so status/decisions travel with the code.

## Locked-in decisions

- Desktop utility (Windows v1) = PowerShell + CIM/WMI, compiled via `ps2exe`.
  No Node/pkg, no Rust for v1 — zero runtime dependency, fastest to ship.
- AI = **one** Mistral call per upload. Deterministic (non-AI) code does hardware
  normalization, compatibility scoring, and FPS estimation first; Mistral only
  writes the natural-language layer on top. Rejected chaining 5-6 separate
  "agent" LLM calls — the brief's agent list maps to code modules, not separate
  LLM round-trips (Vercel Hobby's 10s function timeout + cost/latency).
- RAWG = primary game-data source (free, 500k req/month). IGDB = optional
  fallback, not required for MVP.
- Utility never auto-uploads. User reviews `report.json` locally, then uploads
  it explicitly on the site.

## Phase status

- [x] **Phase 0 — Foundation**: `src/` scaffolded (components/hooks/lib/pages),
  browser-based spec estimate (WebGL renderer sniff + hardwareConcurrency/
  deviceMemory), RAWG client + 6h cache, deterministic scoring, Discover/Library/
  Wishlist/Compare pages, dark/light theme. Verified: builds clean, dev server
  tested in browser (onboarding → specs → tabs all work; RAWG calls fail without
  a real `VITE_RAWG_KEY`, which is expected/correct error handling).
- [x] **Phase 1 — Desktop utility v1**: `utility/collect-specs.ps1` (CIM/WMI scan,
  no PII) + `utility/build-exe.ps1` (ps2exe). Verified locally: real hardware
  scan produced correct JSON (CPU/GPU model, RAM, SSD/HDD, resolution/refresh,
  DirectX version) matching `src/lib/specs.js`'s schema exactly.
- [x] **Phase 2 — Upload + deterministic matching**: `UploadReport.jsx` (file
  input → `parseUtilityReport` validation → schema-checked specs), wired into
  both Onboarding (primary path, browser estimate demoted to fallback) and
  SpecPanel (rescan without redoing onboarding). Client-side validation rejects
  unexpected fields/oversized files; server-side re-validation lands with the
  Phase 3 API since that's the first server-side touchpoint for uploaded data.
  Verified: uploaded a real `report.json` from the Phase 1 utility through the
  browser file picker, confirmed exact GPU/CPU model rendered correctly.
- [x] **Phase 3 — Mistral integration**: `api/recommend.js` (one Mistral call,
  `MISTRAL_API_KEY` server-side only, validates specs/candidates shape and
  size independently of the client, JSON-mode response). Client side:
  `src/lib/mistral.js` + `AIInsights.jsx` (opt-in button, not automatic —
  avoids burning API spend on every page load), wired into `Discover.jsx`
  (profile summary + upgrade suggestions + hidden-gem badges) and
  `GameDetailModal.jsx` (per-game explanation). Verified: unit-tested
  `api/recommend.js`'s handler directly (wrong method, missing/malformed
  specs, empty candidates, missing API key) — all five cases return the
  correct status/error without a live Mistral key. Full live-call path still
  needs a real `MISTRAL_API_KEY` to verify end-to-end.
- [x] **Phase 4 — UX polish**: added genre filter + sort control (Best match /
  Highest rated / Newest) to Discover, on top of Phase 0's mood filters/search
  and Phase 3's AI insights/hidden-gem badges. Verified: dropdowns render and
  don't crash without live RAWG data; deeper "does this look good with real
  content" pass still needs a live `VITE_RAWG_KEY`.
- [x] **Phase 5 — Hardening & scale-out**: `src/lib/rateLimit.js` (best-effort
  in-memory per-IP limiter — bounds a single warm instance only, not a hard
  guarantee across Vercel's multiple instances; upgrade to Upstash Redis if
  usage ever demands it) applied to both `api/recommend.js` (10 calls/10min/IP)
  and the new `api/igdb.js` (30/min/IP, fallback game-data proxy — only 3 fixed
  request shapes accepted, no raw query passthrough, so it can't be used as an
  open proxy for our IGDB credentials). macOS/Linux utility ports remain
  deferred, not MVP, per the original plan.
  Verified: scripted 11 calls against `api/recommend.js` — first 10 pass
  through to the (missing, expected) API-key check, 11th correctly 429s.
  `api/igdb.js` validation order bug found and fixed during this pass: it was
  checking IGDB credentials *before* validating the request body, so a
  malformed request with missing credentials always reported the credentials
  error and masked real 400s. Fixed by validating input first; re-tested all
  four bad-input cases plus the credentials-missing case, all now return the
  correct status.

## Enhancement Round — Smarter AI, Richer Data, Premium UI

App is live at spec-match-ten.vercel.app with real `VITE_RAWG_KEY` and
`MISTRAL_API_KEY` configured on Vercel (confirmed working live: real RAWG
games render, AI insights button returns real profile summary/upgrade
suggestions/hidden-gem badges). This round makes the AI recommendations
deeply hardware-specific, enriches game data (screenshots/description/
developers/trailers/Metacritic), and redesigns the visual system around
Xbox App + Discord as the primary references (user's explicit choice, not a
blend of all named platforms). Full rationale, the two QA-caught architecture
guardrails, and exact drafted prompt/CSS text live in
`~/.claude/plans/vectorized-wandering-dawn.md` (overwritten with this round's
plan — the Phase 0-5 plan above is preserved in this file's history).

- [x] **Phase 6 — Data layer**: `src/lib/rawg.js`'s `enrichGame()` extended
  with metacritic/ESRB/playtime (free on both list and detail RAWG responses)
  plus detail-only fields (description, developers, publishers, website,
  trailer) that come back `undefined` on list data by design; fixed a bug
  where store names were silently dropped from `storeLinks`. Added
  `fetchGameScreenshots()` and `rawgImage()` (crop/resize URL helper).
  Guardrail: screenshots are fetched only from `GameDetailModal`'s own mount
  effect, never folded into the shared `enrichGame()` path Library/Wishlist
  also use — otherwise every saved-game page view would gain a 3rd RAWG call.
  Cache hardening: quota errors on write now sweep expired
  `specmatch:rawg:*` keys once and retry, instead of permanently disabling
  caching for the rest of the session. `api/igdb.js` fallback brought to
  parity for its `details` query type only (developers/publishers/
  screenshots/trailer/website/metacritic), and fixed a pre-existing bug where
  IGDB `tags` were requested but hardcoded to `[]` in `normalize()` — now
  sourced from `keywords.name`.
  Verified: `enrichGame()`/`rawgImage()` logic unit-tested against list- and
  detail-shaped fixtures (14 assertions, all pass) — not importable as a live
  module in plain Node since it reads `import.meta.env` at load time, so the
  exact function bodies were tested directly. `api/igdb.js`'s full handler
  tested end-to-end with a mocked `fetch` (Twitch token + IGDB response) for
  both `popular` and `details` query types (11 assertions, all pass) —
  confirms the tags-from-keywords fix, developer/publisher company-flag
  splitting, metacritic scaling, and trailer/screenshot URL construction all
  work. `npm run build` clean. Live-data confirmation (real screenshots
  rendering, real detail fields) pending post-push spot-check against
  spec-match-ten.vercel.app, since no local `.env` key exists for dev-server
  testing.

- [x] **Phase 7 — AI recommendation engine**: rewrote `api/recommend.js`'s
  Mistral system prompt to forbid contradicting the deterministic tier/FPS,
  require every explanation to cite a literal hardware token (with a banned-
  filler-phrase list and bad/good example pair), add per-game bottleneck
  (GPU/CPU/RAM/Storage/balanced, grounded in `scoring.js`'s now-exposed
  `gpuDelta`/`cpuDelta`), `recommendedSettings` + rationale, `similarGameIds`
  (grounded to only ids from the sent candidate list), `confidence` (forced
  low when specs are browser-estimated), and a profile-level
  `overallBottleneck`. Payload stays cheap per the Enhancement Round's
  guardrail — only list-endpoint-free fields (rating/metacritic/esrbRating/
  playtime) plus the full score object, never per-candidate detail fetches.
  Hardening: `AbortController` (8s) around the Mistral call so a hang fails
  clean instead of riding Vercel's platform timeout; explicit `max_tokens`
  (2500); server-side validation of Mistral's returned JSON shape (games ids
  are a subset of candidates sent, all enums valid, similarGameIds grounded)
  — a malformed response now gets a clean 502 instead of being forwarded to
  the client as-is; stopped echoing Mistral's raw error text to the client
  (logged server-side only). `MAX_BODY_BYTES` bumped 32KB→48KB for the larger
  payload. `src/lib/mistral.js` forwards the new cheap fields; `AIInsights.jsx`
  renders `overallBottleneck`; `GameDetailModal.jsx` renders bottleneck/
  settings/confidence chips and a similar-games row (resolved against a
  `catalog` map lifted from `Discover.jsx` up through `App.jsx` — no new
  fetch, per the guardrail).
  Verified: scripted 15 assertions against the handler with a mocked
  `fetch` — all pre-existing 405/400 validation paths still correct; a
  well-formed mocked Mistral response passes through; four distinct
  malformed-response shapes (bad enum, id not in candidate list, wrong
  upgradeSuggestions count, ungrounded similarGameIds) are all rejected with
  a clean 502 and none of the malformed content leaks into the client-facing
  error; upstream HTTP failure no longer leaks raw error text; the abort
  timeout fires at ~8s (measured 8003ms) rather than riding a slower/longer
  upstream hang. `npm run build` clean. Live prompt-quality confirmation
  (does the AI actually write specific, non-generic text) pending post-push
  spot-check against spec-match-ten.vercel.app.

## Known gaps / needs from user

- No local `.env` with a real `VITE_RAWG_KEY` — local dev-server testing of
  RAWG-dependent UI is structural-only (build passes, logic unit-tested);
  live confirmation happens by spot-checking the Vercel deployment after each
  push, which does have real keys configured.
- Every phase is committed + pushed to `main` on completion (no PR review step)
  per explicit standing instruction ("complete other phase and push
  everytime").
