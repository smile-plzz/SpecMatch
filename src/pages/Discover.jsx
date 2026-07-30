import { useEffect, useMemo, useState } from 'react'
import { fetchPopularGames, fetchGenres, enrichGame } from '../lib/rawg'
import { scoreAndRankGames } from '../lib/scoring'
import { GameCard } from '../components/GameCard'
import { AIInsights } from '../components/AIInsights'
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

export function Discover({ specs, onOpenGame, showToast, aiData, onAiData }) {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mood, setMood] = useState(null)
  const [genre, setGenre] = useState('')
  const [genres, setGenres] = useState([])
  const [sort, setSort] = useState('match')
  const [query, setQuery] = useState('')
  const [wishlist, setWishlist] = useState(getWishlist())

  useEffect(() => {
    fetchGenres().then((data) => setGenres(data.results || [])).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchPopularGames({ genres: mood ? MOOD_GENRE[mood] : genre || undefined })
      .then((data) => setGames((data.results || []).map(enrichGame)))
      .catch((err) => {
        setError(err.message)
        showToast?.('Could not load games — check your RAWG API key', 'error')
      })
      .finally(() => setLoading(false))
  }, [mood, genre])

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

  function handleToggleWishlist(gameId) {
    setWishlist(toggleWishlist(gameId))
  }

  return (
    <div className="discover">
      <div className="discover__controls">
        <input
          className="discover__search"
          placeholder="Search games..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="mood-filters">
          {MOODS.map((m) => (
            <button
              key={m}
              className={`mood-chip ${mood === m ? 'mood-chip--active' : ''}`}
              onClick={() => setMood(mood === m ? null : m)}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="discover__filter-row">
          <select className="discover__select" value={genre} onChange={(e) => setGenre(e.target.value)} disabled={!!mood}>
            <option value="">All genres</option>
            {genres.map((g) => <option key={g.id} value={g.slug}>{g.name}</option>)}
          </select>
          <select className="discover__select" value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.entries(SORTS).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
      </div>

      {loading && <p className="discover__status">Loading games…</p>}
      {error && <p className="discover__status discover__status--error">{error}</p>}

      {specs && ranked.length > 0 && (
        <AIInsights specs={specs} ranked={ranked} aiData={aiData} onAiData={onAiData} showToast={showToast} />
      )}

      <div className="game-grid">
        {filtered.map(({ game, score }) => (
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
    </div>
  )
}
