import { useEffect, useState } from 'react'
import { Landing } from './pages/Landing'
import { SystemSetup } from './pages/SystemSetup'
import { UploadReportScreen } from './pages/UploadReportScreen'
import { SystemProfileScreen } from './pages/SystemProfileScreen'
import { GameSearch } from './pages/GameSearch'
import { CompatibilityResult } from './pages/CompatibilityResult'
import { ToastContainer } from './components/Toast'
import { useToast } from './hooks/useToast'
import { getPrefs, setPrefs } from './lib/store'
import { detectBrowserSpecs } from './lib/specs'
import { IconGamepad, IconMoon, IconSearch, IconSun } from './components/Icons'

// Pivot routing (DESIGN_HANDOFF.md §4/§5): the sidebar/topbar shell mounts
// only from Search onward. Setup/Upload/Profile are a linear step flow with
// no persistent chrome — this replaces the old `Onboarding.jsx` modal-card
// flow and the old always-shell App.jsx structure. No router library was
// introduced (DESIGN_HANDOFF.md §11, FLEXIBLE) since this is a small, linear
// state machine — local `screen` state is enough and avoids a new dependency.
//
// `Discover`, `Compare`, `Library`, `Wishlist` and `Onboarding` are left in
// place, unrouted, per DESIGN_HANDOFF.md §12 ("do not delete") — the old
// heuristic scorer (`scoring.js`) they depend on is untouched.
const LINEAR_SCREENS = ['landing', 'setup', 'upload', 'profile']

export default function App() {
  const prefs = getPrefs()
  const [specs, setSpecs] = useState(prefs.specs)
  const [screen, setScreen] = useState(specs ? 'search' : 'landing')
  const [activeGame, setActiveGame] = useState(null)
  const [theme, setTheme] = useState(prefs.theme)
  const { toasts, dismissToast } = useToast()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setPrefs({ theme: next })
  }

  function completeUpload(newSpecs) {
    setSpecs(newSpecs)
    setPrefs({ specs: newSpecs })
    setScreen('profile')
  }

  function useBrowserEstimate() {
    completeUpload(detectBrowserSpecs())
  }

  function openGame(game) {
    setActiveGame(game)
    setScreen('result')
  }

  if (LINEAR_SCREENS.includes(screen)) {
    return (
      <div className="app app--linear" data-theme={theme}>
        <div className="linear-topbar">
          <span className="sidebar__brand-mark"><IconGamepad size={17} /></span>
          <span className="linear-topbar__brand">SPECMATCH</span>
          <div className="linear-topbar__spacer" />
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
          </button>
        </div>

        {screen === 'landing' && (
          <Landing onCheckPC={() => setScreen('setup')} onBrowseFirst={() => setScreen('search')} />
        )}
        {screen === 'setup' && (
          <SystemSetup onContinue={() => setScreen('upload')} onUseBrowserEstimate={useBrowserEstimate} />
        )}
        {screen === 'upload' && <UploadReportScreen onComplete={completeUpload} />}
        {screen === 'profile' && specs && (
          <SystemProfileScreen specs={specs} onRescan={() => setScreen('upload')} onSearch={() => setScreen('search')} />
        )}

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    )
  }

  return (
    <div className="app" data-theme={theme}>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__brand-mark"><IconGamepad size={18} /></span>
          <div>
            <h1>SPECMATCH</h1>
            <span>Hardware-aware verdicts</span>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Sections">
          <button className="nav-item nav-item--active" onClick={() => setScreen('search')} aria-current="page">
            <IconSearch size={18} /> Search
          </button>
        </nav>

        <div className="sidebar__footer">
          {specs ? (
            <div className="rig-card">
              <div className="rig-card__head">
                {specs.source === 'utility' ? 'Desktop scan' : specs.source === 'manual' ? 'Manual entry' : 'Browser estimate'}
              </div>
              <div className="rig-card__line" title={specs.gpu?.model ?? undefined}><span>GPU</span> {specs.gpu?.model ?? 'Unknown'}</div>
              <div className="rig-card__line" title={specs.cpu?.model ?? undefined}><span>CPU</span> {specs.cpu?.model ?? 'Unknown'}</div>
              <div className="rig-card__line"><span>RAM</span> {specs.ramGB ? `${specs.ramGB} GB` : 'Unknown'}</div>
            </div>
          ) : (
            <button className="rail-badge" onClick={() => setScreen('setup')}>+ Add your PC</button>
          )}

          <div className="sidebar__theme">
            <span className="sidebar__theme-label">{theme === 'dark' ? 'Dark' : 'Light'} theme</span>
            <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
            </button>
          </div>
        </div>
      </aside>

      <div className="app__content">
        <header className="topbar">
          <div className="topbar__brand"><span className="sidebar__brand-mark"><IconGamepad size={17} /></span></div>
          <div className="topbar__titles">
            <h2>{screen === 'result' ? 'Compatibility' : 'Search'}</h2>
            <p>{screen === 'result' ? 'Component-by-component, not a guess.' : 'Live search — verdicts only where requirements are verified.'}</p>
          </div>
          <div className="topbar__actions">
            <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
            </button>
          </div>
        </header>

        <main className="app__main">
          {screen === 'search' && <GameSearch specs={specs} onSelect={openGame} />}
          {screen === 'result' && (
            <CompatibilityResult
              game={activeGame}
              specs={specs}
              onBack={() => setScreen('search')}
              onCompareMyPC={() => setScreen('setup')}
            />
          )}
        </main>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
