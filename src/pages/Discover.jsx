import { useEffect, useMemo, useState } from 'react'
import { fetchPopularGames, enrichGame } from '../lib/rawg'
import { scoreAndRankGames } from '../lib/scoring'
import { GameCard } from '../components/GameCard'
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

export function Discover({ specs, onOpenGame, showToast }) {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mood, setMood] = useState(null)
  const [query, setQuery] = useState('')
  const [wishlist, setWishlist] = useState(getWishlist())

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchPopularGames({ genres: mood ? MOOD_GENRE[mood] : undefined })
      .then((data) => setGames((data.results || []).map(enrichGame)))
      .catch((err) => {
        setError(err.message)
        showToast?.('Could not load games — check your RAWG API key', 'error')
      })
      .finally(() => setLoading(false))
  }, [mood])

  const ranked = useMemo(() => {
    if (!specs) return games.map((game) => ({ game, score: null }))
    return scoreAndRankGames(games, specs)
  }, [games, specs])

  const filtered = useMemo(() => {
    if (!query.trim()) return ranked
    const q = query.toLowerCase()
    return ranked.filter(({ game }) => game.title.toLowerCase().includes(q))
  }, [ranked, query])

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
      </div>

      {loading && <p className="discover__status">Loading games…</p>}
      {error && <p className="discover__status discover__status--error">{error}</p>}

      <div className="game-grid">
        {filtered.map(({ game, score }) => (
          <GameCard
            key={game.id}
            game={game}
            score={score}
            onOpen={onOpenGame}
            onToggleWishlist={handleToggleWishlist}
            isWishlisted={wishlist.includes(game.id)}
          />
        ))}
      </div>
    </div>
  )
}
