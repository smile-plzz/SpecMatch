import { useState } from 'react'
import {
  IconGamepad, IconMonitor, IconChip, IconUpload, IconSearch, IconCheck,
  IconWarning, IconClose, IconSun, IconMoon, IconRefresh,
} from '../components/Icons'

// Illustrative-only data for the mockup — the real dataset (30-50 curated
// games with sourced requirements) is a separate build task (PIVOT-PLAN.md §4).
const MOCK_PROFILE = {
  os: 'Windows 11 (23H2)',
  cpu: 'AMD Ryzen 5 5600X',
  gpu: 'NVIDIA RTX 3060 12GB',
  ramGB: 16,
  storageFreeGB: 214,
  directx: 'DirectX 12',
}

const MOCK_GAMES = [
  {
    id: 'baldurs-gate-3',
    title: "Baldur's Gate 3",
    year: 2023,
    art: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=200&h=200&fit=crop',
    verdict: 'playable',
    score: 88,
    components: [
      { label: 'GPU', you: 'RTX 3060 12GB', need: 'RTX 2060 (min) / RTX 3060 (rec)', status: 'pass', note: 'Meets recommended' },
      { label: 'CPU', you: 'Ryzen 5 5600X', need: 'i7-8700K / Ryzen 5 3600 (rec)', status: 'pass', note: 'Above recommended' },
      { label: 'VRAM', you: '12 GB', need: '6 GB (rec)', status: 'pass', note: 'Well above' },
      { label: 'RAM', you: '16 GB', need: '8 GB (rec)', status: 'pass', note: 'Sufficient' },
      { label: 'OS', you: 'Windows 11', need: 'Windows 10/11 64-bit', status: 'pass', note: 'Compatible' },
      { label: 'Storage', you: '214 GB free', need: '150 GB', status: 'pass', note: 'Sufficient' },
    ],
    bottleneck: null,
    settings: 'High settings, 1080p likely; 1440p should hold at Medium–High.',
    source: 'Steam store page, retrieved 2026-08-01',
  },
  {
    id: 'alan-wake-2',
    title: 'Alan Wake 2',
    year: 2023,
    art: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=200&h=200&fit=crop',
    verdict: 'playable-limited',
    score: 61,
    components: [
      { label: 'GPU', you: 'RTX 3060 12GB', need: 'RTX 2060 (min) / RTX 3070 (rec)', status: 'partial', note: 'Meets minimum, below recommended' },
      { label: 'CPU', you: 'Ryzen 5 5600X', need: 'i5-7600K (min) / i7-9700K (rec)', status: 'pass', note: 'Above recommended' },
      { label: 'VRAM', you: '12 GB', need: '8 GB (rec)', status: 'pass', note: 'Sufficient' },
      { label: 'RAM', you: '16 GB', need: '16 GB (rec)', status: 'pass', note: 'Meets recommended' },
      { label: 'OS', you: 'Windows 11', need: 'Windows 10/11 64-bit', status: 'pass', note: 'Compatible' },
      { label: 'Storage', you: '214 GB free', need: '90 GB', status: 'pass', note: 'Sufficient' },
    ],
    bottleneck: 'GPU',
    settings: 'Likely need Medium settings at 1080p for a stable experience; High settings may cause dips.',
    source: 'Steam store page, retrieved 2026-08-01',
  },
  {
    id: 'starfield',
    title: 'Starfield',
    year: 2023,
    art: 'https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=200&h=200&fit=crop',
    verdict: 'not-recommended',
    score: 34,
    components: [
      { label: 'GPU', you: 'RTX 3060 12GB', need: 'RX 6800XT / RTX 2080 (min)', status: 'fail', note: 'Below minimum' },
      { label: 'CPU', you: 'Ryzen 5 5600X', need: 'Ryzen 5 2600X (min)', status: 'pass', note: 'Above minimum' },
      { label: 'VRAM', you: '12 GB', need: '8 GB (min)', status: 'pass', note: 'Sufficient' },
      { label: 'RAM', you: '16 GB', need: '16 GB (min)', status: 'pass', note: 'Meets minimum' },
      { label: 'OS', you: 'Windows 11', need: 'Windows 10/11 64-bit', status: 'pass', note: 'Compatible' },
      { label: 'Storage', you: '214 GB free', need: '125 GB', status: 'pass', note: 'Sufficient' },
    ],
    bottleneck: 'GPU',
    settings: 'Below the tested minimum GPU tier — expect low settings and unstable frame pacing at best.',
    source: 'Steam store page, retrieved 2026-08-01',
  },
]

const VERDICT_META = {
  playable: { label: 'Playable', cls: 'smooth', icon: IconCheck },
  'playable-limited': { label: 'Playable with limitations', cls: 'playable', icon: IconWarning },
  'not-recommended': { label: 'Not Recommended', cls: 'poor', icon: IconClose },
}

const SCREENS = ['landing', 'setup', 'upload', 'profile', 'search', 'result']
const SCREEN_LABELS = {
  landing: 'Landing', setup: 'System Setup', upload: 'Upload Report',
  profile: 'System Profile', search: 'Game Search', result: 'Compatibility Result',
}

export function PivotPrototype() {
  const [screen, setScreen] = useState('landing')
  const [theme, setTheme] = useState('dark')
  const [uploadState, setUploadState] = useState('idle') // idle | parsing | done | error
  const [activeGame, setActiveGame] = useState(MOCK_GAMES[1])
  const [searchQuery, setSearchQuery] = useState('')

  function go(next) {
    setScreen(next)
    window.scrollTo({ top: 0 })
  }

  function simulateUpload() {
    setUploadState('parsing')
    setTimeout(() => setUploadState('done'), 900)
  }

  const filteredGames = MOCK_GAMES.filter((g) =>
    g.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div data-theme={theme}>
      <div className="proto-devbar">
        <span className="proto-devbar__label">Prototype nav (not part of product UI)</span>
        {SCREENS.map((s) => (
          <button
            key={s}
            className={s === screen ? 'btn btn--sm btn--active' : 'btn btn--sm btn--ghost'}
            onClick={() => go(s)}
          >
            {SCREEN_LABELS[s]}
          </button>
        ))}
        <div className="proto-devbar__spacer" />
        <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
          {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
        </button>
      </div>

      <div className="proto-shell">
        {screen === 'landing' && <Landing onStart={() => go('setup')} />}
        {screen === 'setup' && <SystemSetup onContinue={() => go('upload')} />}
        {screen === 'upload' && (
          <UploadReport
            state={uploadState}
            onUpload={simulateUpload}
            onReset={() => setUploadState('idle')}
            onContinue={() => go('profile')}
          />
        )}
        {screen === 'profile' && <SystemProfile onContinue={() => go('search')} />}
        {screen === 'search' && (
          <GameSearch
            query={searchQuery}
            onQuery={setSearchQuery}
            games={filteredGames}
            onSelect={(g) => { setActiveGame(g); go('result') }}
          />
        )}
        {screen === 'result' && <CompatibilityResult game={activeGame} onBack={() => go('search')} />}
      </div>
    </div>
  )
}

function Landing({ onStart }) {
  return (
    <div className="proto-screen proto-screen--narrow">
      <div className="proto-landing__hero">
        <span className="sidebar__brand-mark" style={{ width: '2.6rem', height: '2.6rem' }}>
          <IconGamepad size={24} />
        </span>
        <h1>Know if your PC can run it — before you buy.</h1>
        <p>
          Upload a one-time scan of your hardware. Search any game. Get a clear
          verdict — playable, limited, or not recommended — with the reasons
          behind it, every time.
        </p>
        <button className="btn btn--primary" style={{ padding: '0.85rem 1.8rem', fontSize: '1rem' }} onClick={onStart}>
          Check your PC
        </button>

        <div className="proto-steps-row">
          <span className="proto-step-pill"><span className="proto-step-pill__num">1</span>Download utility</span>
          <span className="proto-step-arrow">→</span>
          <span className="proto-step-pill"><span className="proto-step-pill__num">2</span>Upload report</span>
          <span className="proto-step-arrow">→</span>
          <span className="proto-step-pill"><span className="proto-step-pill__num">3</span>Search any game</span>
        </div>
      </div>
    </div>
  )
}

function SystemSetup({ onContinue }) {
  return (
    <div className="proto-screen proto-screen--narrow">
      <div>
        <span className="eyebrow">Step 1 of 3</span>
        <h2 style={{ fontSize: '1.7rem', marginTop: '0.4rem' }}>Run a quick, local scan</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          A small utility reads your hardware locally and writes a report file.
          Nothing is uploaded automatically — you choose when to share it.
        </p>
      </div>

      <div className="proto-columns">
        <div className="card" style={{ padding: '1.1rem 1.2rem' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.7rem' }}>What we collect</h3>
          <ul className="proto-list proto-list--collect">
            <li><IconCheck size={16} /> CPU model, cores/threads</li>
            <li><IconCheck size={16} /> GPU model, VRAM, driver version</li>
            <li><IconCheck size={16} /> RAM amount</li>
            <li><IconCheck size={16} /> OS name/version, architecture</li>
            <li><IconCheck size={16} /> Free storage, display, DirectX version</li>
          </ul>
        </div>
        <div className="card" style={{ padding: '1.1rem 1.2rem' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.7rem' }}>What we never collect</h3>
          <ul className="proto-list proto-list--skip">
            <li><IconClose size={16} /> Your name, username, or hostname</li>
            <li><IconClose size={16} /> Serial numbers or MAC addresses</li>
            <li><IconClose size={16} /> Files, browsing, or personal data</li>
            <li><IconClose size={16} /> Anything sent without your action</li>
          </ul>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn--primary"><IconUpload size={17} /> Download scan utility (.exe)</button>
        <a href="#" className="btn btn--ghost" onClick={(e) => e.preventDefault()}>View script source</a>
      </div>

      <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '1.2rem' }}>
        <button className="btn" onClick={onContinue}>I've run it — continue to upload</button>
      </div>
    </div>
  )
}

function UploadReport({ state, onUpload, onReset, onContinue }) {
  return (
    <div className="proto-screen proto-screen--narrow">
      <div>
        <span className="eyebrow">Step 2 of 3</span>
        <h2 style={{ fontSize: '1.7rem', marginTop: '0.4rem' }}>Upload your system report</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Drop the report file the utility generated. It's parsed in your
          browser — only the structured fields below are stored.
        </p>
      </div>

      {state === 'idle' && (
        <button className="proto-dropzone" onClick={onUpload}>
          <span className="proto-dropzone__icon"><IconUpload size={22} /></span>
          <h3>Drag report file here, or click to browse</h3>
          <p>Accepts specmatch-report.txt · max 64KB</p>
        </button>
      )}

      {state === 'parsing' && (
        <div className="proto-file-row">
          <div className="spinner" />
          <div>
            <div className="proto-file-row__name">specmatch-report.txt</div>
            <div className="proto-file-row__meta">Validating fields…</div>
          </div>
        </div>
      )}

      {state === 'done' && (
        <>
          <div className="proto-file-row">
            <IconCheck size={20} />
            <div>
              <div className="proto-file-row__name">specmatch-report.txt</div>
              <div className="proto-file-row__meta">Report v2.0 · parsed 6/6 fields</div>
            </div>
            <div className="proto-file-row__spacer" />
            <button className="btn btn--sm btn--ghost" onClick={onReset}>Replace</button>
          </div>
          <button className="btn btn--primary" style={{ alignSelf: 'flex-start' }} onClick={onContinue}>
            Continue to profile
          </button>
        </>
      )}

      {/* Error state, shown here for the mockup review rather than gated behind a real failure */}
      <div className="state-card state-card--error" style={{ padding: '1.5rem' }}>
        <span className="state-card__icon"><IconWarning size={20} /></span>
        <h3>Example: what a bad upload looks like</h3>
        <p>This file isn't a SpecMatch report, or it's from an unsupported version. Re-run the scan utility and upload the file it generates.</p>
      </div>
    </div>
  )
}

function SystemProfile({ onContinue }) {
  return (
    <div className="proto-screen proto-screen--narrow">
      <div>
        <span className="eyebrow">Step 3 of 3</span>
        <h2 style={{ fontSize: '1.7rem', marginTop: '0.4rem' }}>Your system profile</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          This is what we'll compare against every game you search. You won't
          need to upload again — rescan any time from here.
        </p>
      </div>

      <div className="proto-profile-grid">
        <div className="proto-profile-stat">
          <span className="proto-profile-stat__label"><IconMonitor size={14} /> Operating system</span>
          <span className="proto-profile-stat__value">{MOCK_PROFILE.os}</span>
        </div>
        <div className="proto-profile-stat">
          <span className="proto-profile-stat__label"><IconChip size={14} /> Processor</span>
          <span className="proto-profile-stat__value">{MOCK_PROFILE.cpu}</span>
        </div>
        <div className="proto-profile-stat">
          <span className="proto-profile-stat__label"><IconChip size={14} /> Graphics</span>
          <span className="proto-profile-stat__value">{MOCK_PROFILE.gpu}</span>
        </div>
        <div className="proto-profile-stat">
          <span className="proto-profile-stat__label"><IconChip size={14} /> Memory</span>
          <span className="proto-profile-stat__value">{MOCK_PROFILE.ramGB} GB RAM</span>
        </div>
        <div className="proto-profile-stat">
          <span className="proto-profile-stat__label"><IconMonitor size={14} /> Storage</span>
          <span className="proto-profile-stat__value">{MOCK_PROFILE.storageFreeGB} GB free</span>
        </div>
        <div className="proto-profile-stat">
          <span className="proto-profile-stat__label"><IconMonitor size={14} /> Graphics API</span>
          <span className="proto-profile-stat__value">{MOCK_PROFILE.directx}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        <button className="btn"><IconRefresh size={16} /> Rescan / upload new report</button>
        <button className="btn btn--ghost">Edit manually</button>
      </div>

      <button className="btn btn--primary" style={{ alignSelf: 'flex-start', padding: '0.75rem 1.6rem' }} onClick={onContinue}>
        Search for a game
      </button>
    </div>
  )
}

function GameSearch({ query, onQuery, games, onSelect }) {
  return (
    <div className="proto-screen proto-screen--narrow">
      <div>
        <h2 style={{ fontSize: '1.7rem' }}>Can my PC run it?</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.4rem' }}>Search a game to get an instant compatibility verdict against your profile.</p>
      </div>

      <div className="search-field" style={{ maxWidth: 'none' }}>
        <IconSearch size={17} />
        <input
          placeholder="Search a game…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          autoFocus
        />
      </div>

      {games.length > 0 ? (
        <div className="proto-search-results">
          {games.map((g) => (
            <button key={g.id} className="proto-search-result" onClick={() => onSelect(g)}>
              <img src={g.art} alt="" />
              <div>
                <div className="proto-search-result__title">{g.title}</div>
                <div className="proto-search-result__meta">{g.year} · Windows</div>
              </div>
              <span className="proto-search-result__arrow">→</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="state-card">
          <span className="state-card__icon"><IconSearch size={20} /></span>
          <h3>No matches in the curated list yet</h3>
          <p>We're covering a growing set of games during early access. Let us know what's missing and we'll prioritize it.</p>
        </div>
      )}
    </div>
  )
}

function CompatibilityResult({ game, onBack }) {
  const meta = VERDICT_META[game.verdict]
  const Icon = meta.icon
  const ringColor = `var(--${meta.cls})`

  return (
    <div className="proto-screen">
      <button className="btn btn--ghost btn--sm" style={{ alignSelf: 'flex-start' }} onClick={onBack}>← Back to search</button>

      <div className="proto-result-head">
        <img src={game.art} alt="" />
        <div className="proto-result-head__info">
          <h2>{game.title}</h2>
          <div className="proto-result-head__meta">{game.year} · Windows</div>
          <span className={`proto-verdict proto-verdict--${meta.cls}`}>
            <Icon size={16} /> {meta.label}
          </span>
        </div>
        <div className="proto-score-ring" style={{ '--pct': game.score, '--ring-color': ringColor }}>
          <div className="proto-score-ring__inner">
            <span className="proto-score-ring__num">{game.score}</span>
            <span className="proto-score-ring__pct">/ 100</span>
          </div>
        </div>
      </div>

      {game.bottleneck && (
        <div className="proto-bottleneck">
          <IconWarning size={20} />
          <p>
            <strong>Main bottleneck: {game.bottleneck}.</strong> Your other components clear the bar — this is the one holding performance back. See the row below for the exact gap.
          </p>
        </div>
      )}

      <div>
        <h3 className="section-title">Hardware comparison</h3>
        <table className="compat-table">
          <thead>
            <tr><th>Component</th><th>Your system</th><th>Requirement</th><th>Result</th></tr>
          </thead>
          <tbody>
            {game.components.map((c) => (
              <tr key={c.label}>
                <td>{c.label}</td>
                <td>{c.you}</td>
                <td>{c.need}</td>
                <td className={`verdict--${c.status === 'pass' ? 'smooth' : c.status === 'partial' ? 'playable' : 'poor'}`}>
                  {c.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ padding: '1rem 1.2rem' }}>
        <div className="proto-settings-band">
          <span className="chip chip--accent">Expected settings</span>
          <span>{game.settings}</span>
        </div>
      </div>

      <div className="proto-source-line">
        Requirement data: {game.source}. Estimate only — not a guaranteed frame rate.
      </div>
    </div>
  )
}
