import { useEffect, useState } from 'react'
import { getWishlist, toggleWishlist } from '../lib/store'
import { fetchGameDetails, enrichGame } from '../lib/rawg'
import { scoreGameForSpecs } from '../lib/scoring'
import { GameCard } from '../components/GameCard'
import { GameCardSkeleton } from '../components/GameCardSkeleton'
import { IconHeart } from '../components/Icons'

export function Wishlist({ specs, onOpenGame }) {
  const [ids, setIds] = useState(getWishlist())
  const [games, setGames] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(ids.length > 0)
    Promise.all(ids.map((id) => fetchGameDetails(id).then(enrichGame).catch(() => null))).then((results) => {
      if (cancelled) return
      const byId = {}
      results.forEach((g) => { if (g) byId[g.id] = g })
      setGames(byId)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [ids.join(',')])

  function handleToggle(gameId) {
    setIds(toggleWishlist(gameId))
  }

  if (ids.length === 0) {
    return (
      <div className="state-card">
        <span className="state-card__icon"><IconHeart size={22} /></span>
        <h3>Nothing saved yet</h3>
        <p>Tap the heart on any game in Discover and it waits for you here, still scored against your PC.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="game-grid">
        {ids.map((id) => <GameCardSkeleton key={id} />)}
      </div>
    )
  }

  return (
    <div className="game-grid">
      {ids.map((id) => games[id] && (
        <GameCard
          key={id}
          game={games[id]}
          score={specs ? scoreGameForSpecs(games[id], specs) : null}
          onOpen={onOpenGame}
          onToggleWishlist={handleToggle}
          isWishlisted
        />
      ))}
    </div>
  )
}
