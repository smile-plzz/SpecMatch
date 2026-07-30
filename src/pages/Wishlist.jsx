import { useEffect, useState } from 'react'
import { getWishlist, toggleWishlist } from '../lib/store'
import { fetchGameDetails, enrichGame } from '../lib/rawg'
import { GameCard } from '../components/GameCard'

export function Wishlist({ onOpenGame }) {
  const [ids, setIds] = useState(getWishlist())
  const [games, setGames] = useState({})

  useEffect(() => {
    let cancelled = false
    Promise.all(ids.map((id) => fetchGameDetails(id).then(enrichGame).catch(() => null))).then((results) => {
      if (cancelled) return
      const byId = {}
      results.forEach((g) => { if (g) byId[g.id] = g })
      setGames(byId)
    })
    return () => { cancelled = true }
  }, [ids.join(',')])

  function handleToggle(gameId) {
    setIds(toggleWishlist(gameId))
  }

  if (ids.length === 0) {
    return <p className="empty-state">Your wishlist is empty — add games from Discover.</p>
  }

  return (
    <div className="game-grid">
      {ids.map((id) => games[id] && (
        <GameCard key={id} game={games[id]} onOpen={onOpenGame} onToggleWishlist={handleToggle} isWishlisted />
      ))}
    </div>
  )
}
