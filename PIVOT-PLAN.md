# SpecMatch Pivot — Product & Design Plan

Status: **design phase, not yet implemented.** Source of truth for the next build phase.

---

## 1. What exists today (audit summary)

SpecMatch today: Vite + React 18 SPA, no router (tab state in `App.jsx`), no backend beyond two Vercel functions (`api/recommend.js` for an optional Mistral AI commentary call, `api/igdb.js` as a fallback game-data proxy). Games come live from RAWG's public API, normalized client-side (`src/lib/rawg.js`) — no local game catalog exists anywhere. `localStorage` is the only persistence (library, wishlist, prefs, specs).

Hardware input already has three working paths: a PowerShell scan utility (`utility/collect-specs.ps1`, WMI/CIM based) producing a `report.json`, a file-upload UI (`UploadReport.jsx`) with schema whitelist validation (`src/lib/specs.js`), and a rough in-browser fallback estimate (`navigator.hardwareConcurrency`/`deviceMemory`/WebGL renderer string). Compatibility "scoring" (`src/lib/scoring.js`) is a deterministic tier system, but it does **not** compare against real per-game requirements — it estimates a game's hardware "demand" from genre/tag/age heuristics, because RAWG/IGDB expose no min/recommended-spec fields. This is the single biggest gap relative to the new product direction.

Design system: hand-built CSS custom-property tokens (`src/styles/globals.css`, 910 lines), Xbox-app + Discord visual language, dark/light via `[data-theme]`, no component library, no Tailwind. This is worth keeping as-is.

### Reuse / Change / Remove / Missing

**Reuse directly:**
- `src/styles/globals.css` design tokens and primitives (`.btn`, `.card`, `.chip`, `.tier-badge`, `.field`, sidebar/topbar layout, modal, toast system).
- `utility/collect-specs.ps1` + `build-exe.ps1` — the system-audit utility concept and its WMI field selection are exactly what the new flow needs. Output format needs a version bump and restructuring (see §5), not a rewrite of the collection logic.
- `src/lib/specs.js` schema-whitelist validation pattern (extend the whitelist, keep the approach).
- `UploadReport.jsx` upload/validate flow.
- `src/components/Icons.jsx`, `Toast.jsx`/`useToast.js`.
- Rate-limiting pattern (`src/lib/rateLimit.js`) if any server endpoint is kept.

**Change:**
- `src/lib/scoring.js` — replace the genre/tag "demand score" heuristic with real requirement-vs-spec comparison (§3), once a game-requirements dataset exists (§4). Keep the tier-index comparison *mechanism* (it's sound); replace what feeds it.
- `specs.js` schema — extend to a versioned report format (§5) with explicit min/recommended-facing fields (DirectX/Vulkan, OS build, free storage).
- Navigation model — collapse Discover/Library/Wishlist/Compare into the focused flow in §6; some of these pages' *concepts* (search, compare-a-game) survive, restructured around "search then get a verdict" rather than "browse a catalog."

**Remove (or defer past MVP):**
- IGDB fallback proxy — adds a second provider with a second id-namespace bug (audit item 7) for no MVP benefit; only worth reviving if RAWG rate limits become a real problem.
- Mood-filter/browse-a-catalog framing of Discover — the new product is search-first, not browse-first.
- Multi-page tab nav (Library/Wishlist as separate persistent sections) — de-scope to MVP; can return post-MVP as "saved results."

**Missing (must build):**
- A real game-requirements dataset (min/recommended CPU/GPU/RAM/VRAM/OS/storage/API) — does not exist in any form today. This is the actual product-critical gap, bigger than any UI work.
- A defensible compatibility-scoring model driven by that dataset (§3).
- A versioned, extensible system-report format (§5).
- A persisted system-profile concept that survives across a search session without re-uploading (browser storage is sufficient for MVP; no account system needed).

### Risks

**Technical:** No official game-requirements API exists at any real scale (Steam's store API doesn't expose structured min/rec specs reliably; PCGamingWiki has data but no clean bulk API; most bulk sources are scraped and inconsistently formatted). This means the MVP dataset must be a small, hand-curated set (§4) rather than "all games," and the product must communicate that scope honestly. CPU/GPU tiering by regex-on-model-string is brittle to new hardware generations and needs a small ranked reference table instead of pure regex if scoring quality matters.

**Product/UX:** Users expect FPS numbers; the product must resist promising them without real benchmark data — oversell here would be the single most damaging trust failure for what's meant to be a precision tool. Asking a user to download-and-run a `.exe` before they see any value is a real conversion drop-off point; the flow must clearly earn that trust upfront (why we need this, what we don't collect) before the download click.

---

## 2. Pivot architecture — System Profile → Game Search → Compatibility Analysis → Decision

```
[Download utility] → [Run locally] → [Upload report] → [System Profile stored]
                                                              │
                                                              ▼
                                            [Search a game] → [Fetch requirements + game meta]
                                                              │
                                                              ▼
                                    [Compatibility Engine: profile vs requirements]
                                                              │
                                                              ▼
                        [Verdict: status + score + component breakdown + explanation]
```

One profile, reused for every subsequent search — stored client-side (`localStorage`, same as today), no account system for MVP. This is materially simpler than today's multi-tab app: search replaces browse as the primary interaction.

---

## 3. Compatibility scoring model

Do not invent a single arbitrary percentage. Score each dimension independently against **minimum** and **recommended** requirement tiers, then combine.

**Per-component comparison** (only for dimensions the game data actually specifies):
- **CPU**: rank user's CPU and the requirement CPU on a single ordered reference table (a curated list of common CPU model families ranked relative to each other — not regex tier-guessing). Output: below-minimum / meets-minimum / meets-recommended.
- **GPU**: same approach, ranked reference table by relative gaming performance tier, cross-checked against VRAM separately.
- **VRAM**: direct GB comparison against requirement GB.
- **RAM**: direct GB comparison against requirement GB.
- **OS**: version/build comparison (e.g., Windows 10 vs. Windows 11 requirement) — pass/fail, not scored.
- **Storage**: free space vs. required space — pass/fail, surfaced as a warning if insufficient, not part of the performance score.
- **API/DirectX**: supported-version comparison — pass/fail; a hard fail here should override the score (game literally won't run).

**Combining into one status + score:**
1. Any hard-fail dimension (OS incompatible, DirectX unsupported, architecture mismatch) → status is **Not Recommended** regardless of other scores, score capped low.
2. Otherwise, take the weakest-component rule: overall status is bounded by the single worst-performing dimension (this mirrors real bottleneck behavior — a game is only as playable as its weakest relevant component, not an average). GPU and CPU are weighted most heavily since they're the actual performance bottlenecks; RAM/storage/OS act as pass/fail gates.
3. Score (0–100) is a weighted composite of how far above/below minimum-to-recommended each weighted component sits, not a made-up number — e.g., GPU at exactly recommended tier contributes near its full weight; GPU below minimum contributes near zero.
4. Map score ranges to the three statuses: **Playable** (recommended-tier or above on GPU+CPU, no hard fails), **Playable with limitations** (meets minimum but below recommended on GPU or CPU, or RAM tight), **Not Recommended** (below minimum on GPU or CPU, or any hard fail).

**What the product must NOT claim:** no predicted FPS number. Communicate expected relative performance only in qualitative bands ("likely 1080p/high", "likely need medium settings") when the requirement data supports it, always framed as an estimate, never a guarantee — this is the direct answer to the "do not falsely present estimates as guarantees" guardrail. The explanation text should always show its work: "Your GPU (X) meets the recommended tier (Y); your CPU (Z) is above minimum; RAM sufficient" — component-by-component, not just a headline number.

---

## 4. Game data architecture

**Schema per game** (JSON, one file or one DB row per game for MVP):
```json
{
  "id": "string-slug",
  "title": "string",
  "platform": ["Windows"],
  "releaseYear": 2023,
  "requirements": {
    "minimum": {
      "os": "Windows 10 64-bit",
      "cpu": "Intel Core i5-8400 / AMD Ryzen 5 2600",
      "gpu": "NVIDIA GTX 1060 6GB / AMD RX 580 8GB",
      "vramGB": 6,
      "ramGB": 8,
      "storageGB": 70,
      "directx": "12"
    },
    "recommended": { "...same shape..." }
  },
  "source": { "name": "Steam store page", "url": "...", "retrievedAt": "ISO date" },
  "notes": "optional free text for edge cases"
}
```
`cpu`/`gpu` strings are matched against the CPU/GPU reference-rank tables from §3 at scoring time (not stored as pre-computed tiers, so re-ranking the reference tables doesn't require re-entering game data).

**MVP scale:** 30–50 hand-curated games spanning a spread of hardware demand (a few very light indie titles, several mid-range, a few current AAA) sourced from official Steam/publisher store pages, stored as static JSON in-repo — no database needed yet. This is honest about scope (guardrail: prioritize a reliable architecture over pretending to cover "all games") and is trivially upgradable to a real DB later without a schema change, since the shape above is already DB-row-shaped.

**Provenance matters**: every entry carries a `source` field so a user (or future maintainer) can verify a requirement wasn't invented — this also protects against the same false-precision risk called out in §3.

---

## 5. System-audit report format

**Format: versioned JSON**, `.txt` extension for user-friendliness (the file a non-technical user downloads should not look like a config file), but internally strict JSON — human-readable when opened in Notepad, machine-parseable without a custom parser.

```json
{
  "reportVersion": "2.0",
  "generatedAt": "2026-08-21T10:00:00Z",
  "os": { "name": "Windows 11", "build": "23H2", "arch": "x64" },
  "cpu": { "model": "AMD Ryzen 5 5600X", "cores": 6, "threads": 12 },
  "gpu": [{ "model": "NVIDIA RTX 3060", "vramGB": 12, "driverVersion": "552.44" }],
  "ramGB": 16,
  "storage": [{ "drive": "C:", "freeGB": 214, "type": "SSD" }],
  "display": { "width": 2560, "height": 1440, "refreshHz": 144 },
  "directxVersion": "12",
  "notes": []
}
```
Rationale for the format decision: pure `.txt`/Markdown loses structure and forces fragile regex parsing on upload; pure `.json` looks intimidating/technical to a non-developer user. Versioned JSON given a `.txt` extension gets both — Notepad-openable, trivially `JSON.parse`-able, and `reportVersion` lets the parser branch cleanly when fields are added later (extensibility requirement) without breaking old reports. This directly extends today's `specs.js` shape (§1) rather than replacing it — same fields, clearer versioning, GPU/storage moved to arrays to support multi-GPU/multi-drive systems the current single-object shape can't express.

Privacy: keep today's existing discipline (audit confirmed: no hostname/username/serials/MAC collected) and state exactly what's collected in the download-flow UI before the user runs the utility.

---

## 6. MVP scope

**In scope:**
1. Landing page — value prop + primary CTA ("Check your PC").
2. System Setup explainer — what the utility does, what it collects, download link.
3. Upload Report screen — drag/drop, validates against schema, shows parse errors clearly.
4. System Profile screen — compact confirmed hardware summary, persisted, editable.
5. Game Search — search across the curated MVP dataset (~30-50 games).
6. Compatibility Result — the core screen (see §7), full component breakdown.
7. Empty/error/loading states for each of the above.

**Out of scope for MVP:** accounts/cloud sync, wishlist/library/played tracking, mood-based browsing, AI commentary panel (keep the deterministic engine as the trustworthy core; AI narration can return later once the deterministic base is real), macOS/Linux utility, thousands of games.

---

## 7. UI/UX specification

Visual direction continues today's system: minimal, dark-first with light-theme parity, Xbox/Discord-inspired but restrained — no dashboard sprawl, one clear question per screen ("Can my PC run this game?"). Typography and color tokens unchanged from `globals.css`.

### Screens

**Landing / Home** — single clear headline ("Know if your PC can run it — before you buy"), one primary CTA button, brief 3-step visual (Download → Upload → Search), no marketing clutter.

**System Setup** — plain-language explanation of what the utility does and why it's needed, explicit "what we collect / what we never collect" list (transparency by design, addresses the trust risk in §1), download button, link to view the script source (build trust for technical users).

**Upload System Report** — drag/drop zone + file picker fallback, inline validation feedback (accepted fields shown as they parse, clear error state if malformed/wrong version), progress indicator during parse.

**System Profile** — compact card view of detected CPU/GPU/RAM/OS/storage, "edit"/"rescan" affordance, single continue action into search. This reuses today's `SpecPanel`/`rig-card` visual pattern almost unchanged.

**Game Search** — prominent search bar as the dominant element (not a filter alongside a browse grid), live-filtered result list against the curated dataset, each result showing title + platform only (verdict is reserved for the result screen, not spoiled in the list).

**Compatibility Result** (most important screen) — header: game title + one-line status ("Playable" / "Playable with limitations" / "Not Recommended") in the existing tier-badge color language (`--smooth`/`--playable`/`--poor` tokens already exist and map perfectly). Score shown as a number with a short qualifier, not a bare percentage alone. Component-by-component comparison table (reuse today's `.compat-table` pattern) showing user value vs. requirement value vs. pass/fail per row (CPU/GPU/VRAM/RAM/OS/storage/API). A one-paragraph plain-language explanation naming the actual bottleneck. Source/provenance line for the requirement data (small, honest, builds trust). No FPS number — qualitative performance band only, clearly labeled "estimate."

**Empty/Error/Loading** — no-results-for-search state (with a path to request the game be added), malformed-report error state (what went wrong + how to fix), loading skeletons matching the existing shimmer pattern.

### Component hierarchy (new/changed)
`Landing` → `SystemSetup` → `UploadReport` (reused, extended validation) → `SystemProfile` (renamed/refactored `SpecPanel`+`Onboarding` confirm step) → `GameSearch` (replaces `Discover`'s browse grid with a search-first list) → `CompatibilityResult` (new; supersedes `Compare`'s table + `GameDetailModal`'s stat grid, merged into one focused screen).

### Responsive & accessibility
Keep the existing mobile breakpoint pattern (bottom nav collapse at 900px) but the MVP's linear flow needs less persistent chrome than today's 4-tab app — favor a simple back-forward step flow over a persistent sidebar for the setup/upload/profile steps, keeping the sidebar-nav pattern only once the user reaches search. Maintain existing focus-visible/reduced-motion handling (`globals.css:115-119,902-910`) and color-contrast discipline already present in the token set.

---

## 8. Implementation roadmap (post design-approval)

1. **Data foundation** — build the curated game-requirements JSON dataset (§4) and the CPU/GPU reference-rank tables; this unblocks everything else and has no UI dependency.
2. **Report format v2** — extend `specs.js` schema + `collect-specs.ps1` output to the versioned format (§5); keep v1 report parsing as a compatibility fallback during transition.
3. **Compatibility engine v2** — replace `scoring.js`'s heuristic with real requirement comparison (§3) against the new dataset; unit-testable in isolation since it's pure functions.
4. **New screens** — build Landing/SystemSetup/UploadReport(extend)/SystemProfile/GameSearch/CompatibilityResult per §7, reusing existing CSS tokens and components where the hierarchy above indicates.
5. **Cutover** — replace tab-based nav with the linear flow for new users; decide whether to keep Library/Wishlist as a post-MVP addition or cut entirely.
6. **Polish** — empty/error states, accessibility pass, responsive pass.

## 9. Open questions for the user

- Keep Library/Wishlist concepts post-MVP, or cut them for good? (Plan above assumes de-scoped, not deleted from repo history.)
- Any preference on where the curated game list's requirement data gets sourced from case-by-case (Steam store pages vs. PCGamingWiki) — matters for the provenance-citation approach in §4.
- Is the AI commentary panel (Mistral) worth keeping post-MVP once the deterministic engine is real, or should it be dropped entirely given the pivot's precision-first framing?
