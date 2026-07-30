import { useEffect, useState } from 'react'
import { getLibrary } from '../lib/store'
import { fetchGameDetails, enrichGame } from '../lib/rawg'
import { GameCard } from '../components/GameCard'

const SECTIONS = [
  { key: 'liked', label: 'Liked' },
  { key: 'played', label: 'Played' },
  { key: 'disliked', label: 'Disliked' },
]

export function Library({ onOpenGame }) {
  const [games, setGames] = useState({})
  const library = getLibrary()
  const ids = Object.keys(library)

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

  if (ids.length === 0) {
    return <p className="empty-state">No games in your library yet — mark games as Played/Liked/Disliked from their detail view.</p>
  }

  return (
    <div className="library">
      {SECTIONS.map(({ key, label }) => {
        const sectionIds = ids.filter((id) => library[id] === key)
        if (sectionIds.length === 0) return null
        return (
          <section key={key} className="library__section">
            <h3>{label}</h3>
            <div className="game-grid">
              {sectionIds.map((id) => games[id] && (
                <GameCard key={id} game={games[id]} onOpen={onOpenGame} onToggleWishlist={() => {}} isWishlisted={false} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
