import { useState } from 'react'
import { Onboarding } from './components/Onboarding'
import { GameDetailModal } from './components/GameDetailModal'
import { SpecPanel } from './components/SpecPanel'
import { ToastContainer } from './components/Toast'
import { Discover } from './pages/Discover'
import { Library } from './pages/Library'
import { Wishlist } from './pages/Wishlist'
import { Compare } from './pages/Compare'
import { useToast } from './hooks/useToast'
import { getPrefs, setPrefs } from './lib/store'
import { scoreGameForSpecs } from './lib/scoring'

const TABS = [
  { key: 'discover', label: 'Discover' },
  { key: 'library', label: 'Library' },
  { key: 'wishlist', label: 'Wishlist' },
  { key: 'compare', label: 'Compare' },
]

export default function App() {
  const prefs = getPrefs()
  const [specs, setSpecs] = useState(prefs.specs)
  const [tab, setTab] = useState('discover')
  const [openGame, setOpenGame] = useState(null)
  const [theme, setTheme] = useState(prefs.theme)
  const { toasts, showToast, dismissToast } = useToast()

  function handleOnboardingComplete(newSpecs) {
    setSpecs(newSpecs)
    setPrefs({ specs: newSpecs })
  }

  function handleSpecsChange(newSpecs) {
    setSpecs(newSpecs)
    setPrefs({ specs: newSpecs })
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setPrefs({ theme: next })
  }

  if (!specs) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  return (
    <div className="app" data-theme={theme}>
      <header className="app__header">
        <h1>SPECMATCH</h1>
        <nav className="app__tabs">
          {TABS.map(({ key, label }) => (
            <button key={key} className={tab === key ? 'app__tab app__tab--active' : 'app__tab'} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </nav>
        <button className="theme-toggle" onClick={toggleTheme}>{theme === 'dark' ? '☀' : '☾'}</button>
      </header>

      <SpecPanel specs={specs} onChange={handleSpecsChange} />

      <main className="app__main">
        {tab === 'discover' && <Discover specs={specs} onOpenGame={setOpenGame} showToast={showToast} />}
        {tab === 'library' && <Library onOpenGame={setOpenGame} />}
        {tab === 'wishlist' && <Wishlist onOpenGame={setOpenGame} />}
        {tab === 'compare' && <Compare specs={specs} />}
      </main>

      <GameDetailModal
        game={openGame}
        score={openGame ? scoreGameForSpecs(openGame, specs) : null}
        onClose={() => setOpenGame(null)}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
