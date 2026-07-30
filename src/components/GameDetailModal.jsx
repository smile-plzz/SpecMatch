import { useEffect, useState } from 'react'
import { getLibrary, setLibraryStatus } from '../lib/store'
import { fetchGameDetails, fetchGameScreenshots, enrichGame, rawgImage } from '../lib/rawg'

const TIER_LABEL = { smooth: 'Runs Smoothly', playable: 'Playable', poor: 'Not Recommended' }

export function GameDetailModal({ game, score, aiInfo, onClose }) {
  const [detail, setDetail] = useState(null)
  const [screenshots, setScreenshots] = useState([])

  useEffect(() => {
    setDetail(null)
    setScreenshots([])
    if (!game) return
    let cancelled = false

    fetchGameDetails(game.id)
      .then((raw) => { if (!cancelled) setDetail(enrichGame(raw)) })
      .catch(() => {}) // list-shaped `game` data still renders fine without the detail layer

    fetchGameScreenshots(game.id)
      .then((urls) => { if (!cancelled) setScreenshots(urls) })
      .catch(() => {})

    return () => { cancelled = true }
  }, [game?.id])

  if (!game) return null
  const shown = { ...game, ...detail } // detail overlays the fast list-shaped placeholder once loaded
  const library = getLibrary()
  const status = library[game.id]

  function setStatus(next) {
    setLibraryStatus(game.id, status === next ? null : next)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose}>×</button>
        {shown.background && (
          <img className="modal__image" src={rawgImage(shown.background, { w: 1280, mode: 'resize' })} alt={shown.title} />
        )}
        <h2>{shown.title}</h2>

        <div className="modal__meta">
          <span>{shown.genres?.join(', ')}</span>
          {shown.rating != null && <span>★ {shown.rating}</span>}
          {shown.released && <span>{shown.released}</span>}
          {shown.metacritic != null && <span>Metacritic {shown.metacritic}</span>}
        </div>

        {(shown.developers?.length > 0 || shown.publishers?.length > 0) && (
          <div className="modal__meta">
            {shown.developers?.length > 0 && <span>Developer: {shown.developers.join(', ')}</span>}
            {shown.publishers?.length > 0 && <span>Publisher: {shown.publishers.join(', ')}</span>}
          </div>
        )}

        {screenshots.length > 0 && (
          <div className="modal__screenshots">
            {screenshots.map((url) => (
              <img key={url} src={rawgImage(url, { w: 420, h: 236 })} alt="" loading="lazy" />
            ))}
          </div>
        )}

        {shown.description && <p className="modal__description">{shown.description}</p>}

        {score && (
          <table className="compat-table">
            <tbody>
              <tr><td>Compatibility</td><td>{TIER_LABEL[score.tier]}</td></tr>
              <tr><td>Estimated FPS</td><td>{score.fpsRange}</td></tr>
              <tr><td>Suggested GPU tier</td><td>{score.requiredGpuTier}</td></tr>
              <tr><td>Suggested CPU tier</td><td>{score.requiredCpuTier}</td></tr>
            </tbody>
          </table>
        )}

        {aiInfo && (
          <p className="modal__ai-explanation">
            {aiInfo.hiddenGem && <span className="tier-badge tier-badge--gem">Hidden Gem</span>}
            {aiInfo.explanation}
          </p>
        )}

        <div className="modal__actions">
          <button className={status === 'played' ? 'btn btn--active' : 'btn'} onClick={() => setStatus('played')}>Played</button>
          <button className={status === 'liked' ? 'btn btn--active' : 'btn'} onClick={() => setStatus('liked')}>Liked</button>
          <button className={status === 'disliked' ? 'btn btn--active' : 'btn'} onClick={() => setStatus('disliked')}>Disliked</button>
        </div>

        {(shown.storeLinks?.length > 0 || shown.website || shown.trailer) && (
          <div className="modal__stores">
            {shown.website && <a href={shown.website} target="_blank" rel="noreferrer">Website</a>}
            {shown.trailer && <a href={shown.trailer.url} target="_blank" rel="noreferrer">Trailer</a>}
            {shown.storeLinks?.map((store) => (
              <a key={store.url} href={store.url} target="_blank" rel="noreferrer">{store.name ?? 'Store link'}</a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
