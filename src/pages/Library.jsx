import { useEffect, useState } from 'react'
import { getLibrary, getWishlist, toggleWishlist } from '../lib/store'
import { fetchGameDetails, enrichGame } from '../lib/rawg'
import { scoreGameForSpecs } from '../lib/scoring'
import { GameCard } from '../components/GameCard'
import { GameCardSkeleton } from '../components/GameCardSkeleton'
import { IconLibrary } from '../components/Icons'

const SECTIONS = [
  { key: 'liked', label: 'Liked' },
  { key: 'played', label: 'Played' },
  { key: 'disliked', label: 'Disliked' },
]

export function Library({ specs, onOpenGame }) {
  const [games, setGames] = useState({})
  const [loading, setLoading] = useState(true)
  const [wishlist, setWishlist] = useState(getWishlist())
  const library = getLibrary()
  const ids = Object.keys(library)

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

  function handleToggleWishlist(gameId) {
    setWishlist(toggleWishlist(gameId))
  }

  if (ids.length === 0) {
    return (
      <div className="state-card">
        <span className="state-card__icon"><IconLibrary size={22} /></span>
        <h3>Your library is empty</h3>
        <p>Open any game and mark it Played, Liked, or Disliked — it lands here, grouped by how you rated it.</p>
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
    <div className="library">
      {SECTIONS.map(({ key, label }) => {
        const sectionIds = ids.filter((id) => library[id] === key)
        if (sectionIds.length === 0) return null
        return (
          <section key={key} className="library__section">
            <h3 className="section-title">
              {label}
              <span className="section-title__count">{sectionIds.length}</span>
            </h3>
            <div className="game-grid">
              {sectionIds.map((id) => games[id] && (
                <GameCard
                  key={id}
                  game={games[id]}
                  score={specs ? scoreGameForSpecs(games[id], specs) : null}
                  onOpen={onOpenGame}
                  onToggleWishlist={handleToggleWishlist}
                  isWishlisted={wishlist.includes(games[id].id)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
