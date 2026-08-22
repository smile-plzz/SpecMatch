import { useMemo, useState } from 'react'
import GAMES from '../data/games.json'
import { evaluateCompatibility } from '../lib/compatibility'
import { VerdictDot } from '../components/VerdictBadge'
import { useGameArt } from '../lib/useGameArt'
import { rawgThumb } from '../lib/rawg'
import { IconGamepad, IconSearch } from '../components/Icons'

// Search-first, curated dataset only — no live RAWG/IGDB call in this flow
// (DESIGN_HANDOFF.md §11, LOCKED). The verdict dot is deliberately
// under-informative (no score, no label beyond color) so the Result screen
// is never spoiled from the list.
export function GameSearch({ specs, onSelect }) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q ? GAMES.filter((g) => g.title.toLowerCase().includes(q)) : GAMES
    return filtered.map((g) => ({
      game: g,
      verdict: specs ? evaluateCompatibility(specs, g).verdict : null,
    }))
  }, [query, specs])

  return (
    <div className="search-screen">
      <div className="search-screen__head">
        <h2>Can my PC run it?</h2>
        <p>Search a game to get an instant compatibility verdict against your profile.</p>
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

      {results.length > 0 ? (
        <div className="search-results">
          {results.map(({ game, verdict }) => (
            <SearchResultRow key={game.id} game={game} verdict={verdict} onSelect={onSelect} />
          ))}
        </div>
      ) : (
        <div className="state-card">
          <span className="state-card__icon"><IconSearch size={20} /></span>
          <h3>Not in the catalogue yet</h3>
          <p>SpecMatch currently covers {GAMES.length} curated games while we grow the dataset. Let us know what's missing and we'll prioritize it.</p>
        </div>
      )}
    </div>
  )
}

function SearchResultRow({ game, verdict, onSelect }) {
  const { background } = useGameArt(game.title)
  return (
    <button className="search-result-row" onClick={() => onSelect(game.id)}>
      {background ? (
        <img className="search-result-row__art" src={rawgThumb(background)} alt="" loading="lazy" />
      ) : (
        <div className="search-result-row__art search-result-row__art--fallback"><IconGamepad size={18} /></div>
      )}
      {verdict && <VerdictDot verdict={verdict} />}
      <div>
        <div className="search-result-row__title">{game.title}</div>
        <div className="search-result-row__meta">{game.releaseYear} · {game.platform.join(', ')}</div>
      </div>
      <span className="search-result-row__arrow">→</span>
    </button>
  )
}
