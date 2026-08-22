import { useEffect, useState } from 'react'
import GAMES from '../data/games.json'
import { evaluateCompatibility } from '../lib/compatibility'
import { VerdictDot } from '../components/VerdictBadge'
import { rawgThumb, searchGames, fetchPopularGames, enrichGame } from '../lib/rawg'
import { IconGamepad, IconSearch, IconWarning } from '../components/Icons'

// Live-search architecture: RAWG is the discovery source (any game, current
// data, not a fixed list) — this replaced an earlier "curated dataset only,
// no live API" version per explicit direction to make search live. Real
// min/rec requirements still only exist for the small hand-curated set in
// `src/data/games.json` (no free API exposes those), so a RAWG result either
// resolves to a verified curated entry (real verdict) or is flagged as
// "not verified" (gray dot, no score) — never a fabricated one.
const VERIFIED_BY_TITLE = new Map(GAMES.map((g) => [g.title.toLowerCase(), g]))

function findVerified(title) {
  return VERIFIED_BY_TITLE.get((title || '').toLowerCase()) || null
}

export function GameSearch({ specs, onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    const timer = setTimeout(() => {
      const req = query.trim() ? searchGames(query.trim()) : fetchPopularGames({ pageSize: 15 })
      req
        .then((data) => {
          if (cancelled) return
          setResults((data.results || []).map(enrichGame))
          setStatus('ready')
        })
        .catch(() => {
          if (!cancelled) { setResults([]); setStatus('error') }
        })
    }, query ? 350 : 0) // debounce typed queries only, not the initial popular-games load

    return () => { cancelled = true; clearTimeout(timer) }
  }, [query])

  return (
    <div className="search-screen">
      <div className="search-screen__head">
        <h2>Can my PC run it?</h2>
        <p>Live search — real-time game data. Verdicts appear for the games we have verified requirements for.</p>
      </div>

      <div className="search-field" style={{ maxWidth: 'none' }}>
        <IconSearch size={17} />
        <input placeholder="Search a game…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      </div>

      {!specs && (
        <div className="no-profile-banner">
          No system profile yet — results will show requirements only, without a personal verdict.
        </div>
      )}

      {status === 'error' && (
        <div className="state-card state-card--error">
          <span className="state-card__icon"><IconWarning size={20} /></span>
          <h3>Live game data unavailable</h3>
          <p>Couldn't reach the game database right now. This is a live lookup, not cached data — check your connection and try again rather than trusting a stale result.</p>
        </div>
      )}

      {status === 'loading' && (
        <div className="search-results">
          {[1, 2, 3, 4].map((i) => <div key={i} className="search-result-row search-result-row--skeleton shimmer" />)}
        </div>
      )}

      {status === 'ready' && results.length > 0 && (
        <div className="search-results">
          {results.map((game) => {
            const verified = findVerified(game.title)
            const verdict = verified && specs ? evaluateCompatibility(specs, verified).verdict : null
            return (
              <button key={game.id} className="search-result-row" onClick={() => onSelect(game)}>
                {game.background ? (
                  <img className="search-result-row__art" src={rawgThumb(game.background)} alt="" loading="lazy" />
                ) : (
                  <div className="search-result-row__art search-result-row__art--fallback"><IconGamepad size={18} /></div>
                )}
                {verdict ? (
                  <VerdictDot verdict={verdict} />
                ) : (
                  <span className="verdict-dot verdict-dot--unknown" title="No verified requirements yet" aria-label="No verified requirements yet" />
                )}
                <div>
                  <div className="search-result-row__title">{game.title}</div>
                  <div className="search-result-row__meta">
                    {game.released ? new Date(game.released).getFullYear() : 'Unknown year'} · {game.platforms?.join(', ') || 'Unknown platform'}
                    {!verified && ' · Not verified'}
                  </div>
                </div>
                <span className="search-result-row__arrow">→</span>
              </button>
            )
          })}
        </div>
      )}

      {status === 'ready' && results.length === 0 && (
        <div className="state-card">
          <span className="state-card__icon"><IconSearch size={20} /></span>
          <h3>No games found</h3>
          <p>Nothing matched that search live. Try a different title or check the spelling.</p>
        </div>
      )}
    </div>
  )
}
