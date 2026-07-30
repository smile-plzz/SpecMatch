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
- [ ] **Phase 1 — Desktop utility v1**: `utility/collect-specs.ps1` (CIM/WMI scan,
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
- [ ] **Phase 3 — Mistral integration**: `api/recommend.js` serverless function,
  one Mistral call, server-side API key via Vercel env var.
- [ ] **Phase 4 — UX polish**: mostly covered by Phase 0's component set;
  revisit once Phase 2/3 data shapes are final.
- [ ] **Phase 5 — Hardening & scale-out**: rate-limiting `/api/recommend`, IGDB
  fallback, macOS/Linux utility ports (deferred, not MVP).

## Known gaps / needs from user

- No live `VITE_RAWG_KEY` or Mistral API key yet — code paths are built and
  error-handle their absence correctly, but end-to-end live-data testing needs
  real keys.
- Every phase is committed + pushed to `main` on completion (no PR review step)
  per explicit instruction.
