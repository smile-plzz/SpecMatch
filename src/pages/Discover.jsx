import { useEffect, useMemo, useState } from 'react'
import { fetchPopularGames, fetchGenres, enrichGame } from '../lib/rawg'
import { fetchPopularGamesIgdb } from '../lib/igdb'
import { scoreAndRankGames } from '../lib/scoring'
import { GameCard } from '../components/GameCard'
import { AIInsights } from '../components/AIInsights'
import { GameCardSkeleton } from '../components/GameCardSkeleton'
import { IconHeart, IconRefresh, IconSearch, IconWarning } from '../components/Icons'
import { getWishlist, toggleWishlist } from '../lib/store'

const MOODS = ['Chill', 'Intense', 'Social', 'Story-Rich', 'Explore', 'Quick Play']
const MOOD_GENRE = {
  Chill: 'casual,simulation',
  Intense: 'action,shooter',
  Social: 'massively-multiplayer',
  'Story-Rich': 'adventure,rpg',
  Explore: 'adventure',
  'Quick Play': 'arcade,indie',
}

const SORTS = {
  match: { label: 'Best match', fn: null }, // scoreAndRankGames's tier order is already the default
  rating: { label: 'Highest rated', fn: (a, b) => (b.game.rating ?? 0) - (a.game.rating ?? 0) },
  newest: { label: 'Newest', fn: (a, b) => new Date(b.game.released ?? 0) - new Date(a.game.released ?? 0) },
}

const TIER_LABEL = { smooth: 'Runs smoothly', playable: 'Playable', poor: 'Not recommended' }

// Hero blurb when the AI layer hasn't run — deterministic, and phrased from the
// same numbers the badge shows so the two can never disagree.
function heroLine(game, score, specs) {
  if (!score) return null
  const gpu = specs?.gpu?.model ?? `a ${specs?.gpu?.tier ?? 'mid'}-tier GPU`
  if (score.tier === 'smooth') return `${gpu} clears this comfortably — expect ${score.fpsRange}.`
  if (score.tier === 'playable') return `${gpu} lands just under the target here — ${score.fpsRange} with settings turned down.`
  return `${gpu} is more than a tier below what this asks for — ${score.fpsRange}.`
}

export function Discover({ specs, onOpenGame, showToast, aiData, onAiData, onGamesChange }) {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mood, setMood] = useState(null)
  const [genre, setGenre] = useState('')
  const [genres, setGenres] = useState([])
  const [sort, setSort] = useState('match')
  const [query, setQuery] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [wishlist, setWishlist] = useState(getWishlist())

  useEffect(() => {
    fetchGenres().then((data) => setGenres(data.results || [])).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    const genreFilter = mood ? MOOD_GENRE[mood] : genre || undefined
    fetchPopularGames({ genres: genreFilter })
      .then((data) => setGames((data.results || []).map(enrichGame)))
      .catch(async (rawgErr) => {
        try {
          const data = await fetchPopularGamesIgdb({ genre: genreFilter })
          setGames(data.results || [])
          showToast?.('RAWG unavailable — showing IGDB results instead', 'info')
        } catch {
          setError(rawgErr.message)
          showToast?.('Could not load games — check your RAWG API key', 'error')
        }
      })
      .finally(() => setLoading(false))
  }, [mood, genre, reloadKey])

  useEffect(() => {
    onGamesChange?.(games)
  }, [games])

  const ranked = useMemo(() => {
    if (!specs) return games.map((game) => ({ game, score: null }))
    return scoreAndRankGames(games, specs)
  }, [games, specs])

  const filtered = useMemo(() => {
    let list = ranked
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(({ game }) => game.title.toLowerCase().includes(q))
    }
    const sortFn = SORTS[sort]?.fn
    return sortFn ? [...list].sort(sortFn) : list
  }, [ranked, query, sort])

  // Featured tile = the deterministic top pick, so it always reflects this
  // user's hardware — deliberately taken from `ranked`, not `filtered`, so the
  // "top match" claim survives a switch to Highest rated / Newest. Hidden while
  // searching, when the grid should be the whole answer.
  const hero = !loading && !query.trim() && ranked.length > 0 ? ranked[0] : null
  const heroAi = hero ? aiData?.games?.[hero.game.id] : null
  const gridItems = hero ? filtered.filter(({ game }) => game.id !== hero.game.id) : filtered

  function handleToggleWishlist(gameId) {
    setWishlist(toggleWishlist(gameId))
  }

  return (
    <div className="discover">
      <div className="discover__controls">
        <div className="search-field">
          <IconSearch size={17} />
          <input
            placeholder="Search games…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search games"
          />
        </div>

        <div className="mood-filters">
          {MOODS.map((m) => (
            <button
              key={m}
              className={`mood-chip ${mood === m ? 'mood-chip--active' : ''}`}
              onClick={() => setMood(mood === m ? null : m)}
              aria-pressed={mood === m}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="discover__filter-row">
          <select
            className="field"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            disabled={!!mood}
            aria-label="Filter by genre"
            title={mood ? 'Clear the mood filter to pick a genre' : undefined}
          >
            <option value="">All genres</option>
            {genres.map((g) => <option key={g.id} value={g.slug}>{g.name}</option>)}
          </select>
          <select className="field" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
            {Object.entries(SORTS).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
          </select>
          {!loading && !error && (
            <span className="discover__result-count">
              {filtered.length} {filtered.length === 1 ? 'game' : 'games'}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="state-card state-card--error">
          <span className="state-card__icon"><IconWarning size={22} /></span>
          <h3>Could not load games</h3>
          <p>{error}</p>
          <button className="btn" onClick={() => setReloadKey((k) => k + 1)}>
            <IconRefresh size={15} /> Try again
          </button>
        </div>
      )}

      {hero && (
        <section className="hero">
          {hero.game.background && <img className="hero__art" src={hero.game.background} alt="" />}
          <span className="hero__scrim" />
          <div className="hero__content">
            <span className="eyebrow">Top match for your PC</span>
            <h3>{hero.game.title}</h3>
            <div className="hero__meta">
              {hero.score && (
                <span className={`tier-badge tier-badge--${hero.score.tier}`}>
                  <span className="tier-badge__dot" />
                  {TIER_LABEL[hero.score.tier]}
                </span>
              )}
              {hero.score && <span className="chip">{hero.score.fpsRange}</span>}
              {hero.game.genres?.[0] && <span className="chip">{hero.game.genres[0]}</span>}
              {hero.game.metacritic != null && <span className="chip">Metacritic {hero.game.metacritic}</span>}
            </div>
            <p className="hero__line">{heroAi?.explanation ?? heroLine(hero.game, hero.score, specs)}</p>
            <div className="hero__actions">
              <button className="btn btn--primary" onClick={() => onOpenGame(hero.game)}>View details</button>
              <button className="btn" onClick={() => handleToggleWishlist(hero.game.id)}>
                <IconHeart size={16} filled={wishlist.includes(hero.game.id)} />
                {wishlist.includes(hero.game.id) ? 'Wishlisted' : 'Wishlist'}
              </button>
            </div>
          </div>
        </section>
      )}

      {specs && ranked.length > 0 && (
        <AIInsights specs={specs} ranked={ranked} aiData={aiData} onAiData={onAiData} showToast={showToast} />
      )}

      {loading && (
        <div className="game-grid">
          {Array.from({ length: 8 }, (_, i) => <GameCardSkeleton key={i} />)}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="state-card">
          <span className="state-card__icon"><IconSearch size={22} /></span>
          <h3>No games match</h3>
          <p>
            {query.trim()
              ? `Nothing in this list matches “${query}”. Try a different search, or clear the mood/genre filter.`
              : 'This filter combination came back empty — try another mood or genre.'}
          </p>
        </div>
      )}

      {gridItems.length > 0 && (
        <div className="game-grid">
          {gridItems.map(({ game, score }) => (
            <GameCard
              key={game.id}
              game={game}
              score={score}
              onOpen={onOpenGame}
              onToggleWishlist={handleToggleWishlist}
              isWishlisted={wishlist.includes(game.id)}
              hiddenGem={aiData?.games?.[game.id]?.hiddenGem}
            />
          ))}
        </div>
      )}
    </div>
  )
}
