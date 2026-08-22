import { useEffect, useState } from 'react'
import { searchGames } from './rawg'

// Cosmetic-only enrichment for the curated dataset: RAWG has no requirements
// data (that's the whole reason the curated dataset exists — see
// PIVOT-PLAN.md/DESIGN_HANDOFF.md), so this only ever supplies art/description
// alongside the local, hand-curated verdict logic. Matched by title search
// rather than a hardcoded RAWG id per curated game, since IDs would need to be
// verified one-by-one and a title match degrades gracefully (missing art)
// instead of silently pointing at the wrong game if an id were wrong.
//
// Fails silently (no key configured locally, RAWG down, no match) — callers
// must treat `background`/`description` as optional and render the existing
// fallback-square pattern (see GameCard.jsx) rather than a broken <img>.
export function useGameArt(title) {
  const [art, setArt] = useState({ background: null, description: null, loading: true })

  useEffect(() => {
    let cancelled = false
    setArt({ background: null, description: null, loading: true })

    searchGames(title)
      .then((data) => {
        if (cancelled) return
        const match = (data.results || []).find(
          (g) => g.name?.toLowerCase() === title.toLowerCase()
        ) || data.results?.[0]
        setArt({
          background: match?.background_image || null,
          description: match?.description_raw || null,
          loading: false,
        })
      })
      .catch(() => {
        if (!cancelled) setArt({ background: null, description: null, loading: false })
      })

    return () => { cancelled = true }
  }, [title])

  return art
}
