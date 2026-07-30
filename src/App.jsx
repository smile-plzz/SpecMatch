import { useEffect, useMemo, useState } from 'react'
import { Onboarding } from './components/Onboarding'
import { GameDetailModal } from './components/GameDetailModal'
import { SpecPanel } from './components/SpecPanel'
import { ToastContainer } from './components/Toast'
import { Discover } from './pages/Discover'
import { Library } from './pages/Library'
import { Wishlist } from './pages/Wishlist'
import { Compare } from './pages/Compare'
import { useToast } from './hooks/useToast'
import { getLibrary, getPrefs, getWishlist, setPrefs } from './lib/store'
import { scoreGameForSpecs } from './lib/scoring'
import {
  IconCompare,
  IconDiscover,
  IconGamepad,
  IconHeart,
  IconLibrary,
  IconMoon,
  IconSun,
} from './components/Icons'

const TABS = [
  {
    key: 'discover',
    label: 'Discover',
    Icon: IconDiscover,
    title: 'Discover',
    subtitle: 'Ranked against your hardware, not against a generic PC.',
  },
  {
    key: 'library',
    label: 'Library',
    Icon: IconLibrary,
    title: 'Your library',
    subtitle: 'Everything you have marked as played, liked, or disliked.',
  },
  {
    key: 'wishlist',
    label: 'Wishlist',
    Icon: IconHeart,
    title: 'Wishlist',
    subtitle: 'Games saved for later — still scored against your rig.',
  },
  {
    key: 'compare',
    label: 'Compare',
    Icon: IconCompare,
    title: 'Compare',
    subtitle: 'Put any game side by side with your PC.',
  },
]

export default function App() {
  const prefs = getPrefs()
  const [specs, setSpecs] = useState(prefs.specs)
  const [tab, setTab] = useState('discover')
  const [openGame, setOpenGame] = useState(null)
  const [theme, setTheme] = useState(prefs.theme)
  const [aiData, setAiData] = useState(null)
  const [discoverGames, setDiscoverGames] = useState([])
  const { toasts, showToast, dismissToast } = useToast()

  // Theme lives on <html> as well as the app shell so overscroll, the modal
  // overlay, and the onboarding screen all sit on the themed background.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const catalogById = useMemo(
    () => Object.fromEntries(discoverGames.map((g) => [g.id, g])),
    [discoverGames]
  )

  // Read on every render rather than mirrored in state: both are tiny
  // localStorage reads, and it keeps the nav counts honest after a toggle
  // anywhere in the tree without threading callbacks through every page.
  const counts = {
    library: Object.keys(getLibrary()).length,
    wishlist: getWishlist().length,
  }

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

  const active = TABS.find((t) => t.key === tab) ?? TABS[0]

  return (
    <div className="app" data-theme={theme}>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__brand-mark"><IconGamepad size={18} /></span>
          <div>
            <h1>SPECMATCH</h1>
            <span>Hardware-aware picks</span>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Sections">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              className={tab === key ? 'nav-item nav-item--active' : 'nav-item'}
              onClick={() => setTab(key)}
              aria-current={tab === key ? 'page' : undefined}
            >
              <Icon size={18} />
              {label}
              {counts[key] > 0 && <span className="nav-item__badge">{counts[key]}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="rig-card">
            <div className="rig-card__head">
              {specs.source === 'utility' ? 'Desktop scan' : 'Browser estimate'}
            </div>
            <div className="rig-card__line" title={specs.gpu?.model ?? undefined}>
              <span>GPU</span> {specs.gpu?.model ?? `~${specs.gpu?.tier ?? 'unknown'}`}
            </div>
            <div className="rig-card__line" title={specs.cpu?.model ?? undefined}>
              <span>CPU</span> {specs.cpu?.model ?? `~${specs.cpu?.tier ?? 'unknown'}`}
            </div>
            <div className="rig-card__line">
              <span>RAM</span> {specs.ramGB ? `${specs.ramGB} GB` : 'Unknown'}
            </div>
          </div>

          <div className="sidebar__theme">
            <span className="sidebar__theme-label">{theme === 'dark' ? 'Dark' : 'Light'} theme</span>
            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
            </button>
          </div>
        </div>
      </aside>

      <div className="app__content">
        <header className="topbar">
          <div className="topbar__brand">
            <span className="sidebar__brand-mark"><IconGamepad size={17} /></span>
          </div>
          <div className="topbar__titles">
            <h2>{active.title}</h2>
            <p>{active.subtitle}</p>
          </div>
          <div className="topbar__actions">
            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
            </button>
          </div>
        </header>

        <SpecPanel specs={specs} onChange={handleSpecsChange} />

        <main className="app__main">
          {tab === 'discover' && (
            <Discover
              specs={specs}
              onOpenGame={setOpenGame}
              showToast={showToast}
              aiData={aiData}
              onAiData={setAiData}
              onGamesChange={setDiscoverGames}
            />
          )}
          {tab === 'library' && <Library specs={specs} onOpenGame={setOpenGame} />}
          {tab === 'wishlist' && <Wishlist specs={specs} onOpenGame={setOpenGame} />}
          {tab === 'compare' && <Compare specs={specs} />}
        </main>
      </div>

      <GameDetailModal
        game={openGame}
        score={openGame ? scoreGameForSpecs(openGame, specs) : null}
        aiInfo={openGame ? aiData?.games?.[openGame.id] : null}
        catalog={catalogById}
        onOpenSimilar={setOpenGame}
        onClose={() => setOpenGame(null)}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
