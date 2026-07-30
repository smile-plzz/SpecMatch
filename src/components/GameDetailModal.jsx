import { useEffect, useState } from 'react'
import { getLibrary, setLibraryStatus } from '../lib/store'
import { fetchGameDetails, fetchGameScreenshots, enrichGame } from '../lib/rawg'
import { IconClose, IconSparkle } from './Icons'

const TIER_LABEL = { smooth: 'Runs smoothly', playable: 'Playable', poor: 'Not recommended' }
const STATUSES = [
  { key: 'played', label: 'Played' },
  { key: 'liked', label: 'Liked' },
  { key: 'disliked', label: 'Disliked' },
]

export function GameDetailModal({ game, score, aiInfo, catalog, onOpenSimilar, onClose }) {
  const [detail, setDetail] = useState(null)
  const [screenshots, setScreenshots] = useState([])
  const [status, setStatusState] = useState(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setDetail(null)
    setScreenshots([])
    setExpanded(false)
    if (!game) return
    setStatusState(getLibrary()[game.id] ?? null)
    let cancelled = false

    fetchGameDetails(game.id)
      .then((raw) => { if (!cancelled) setDetail(enrichGame(raw)) })
      .catch(() => {}) // list-shaped `game` data still renders fine without the detail layer

    fetchGameScreenshots(game.id)
      .then((urls) => { if (!cancelled) setScreenshots(urls) })
      .catch(() => {})

    return () => { cancelled = true }
  }, [game?.id])

  // Escape closes, and the page behind stops scrolling while the modal is up.
  useEffect(() => {
    if (!game) return
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [game, onClose])

  if (!game) return null
  const shown = { ...game, ...detail } // detail overlays the fast list-shaped placeholder once loaded

  function setStatus(next) {
    const applied = status === next ? null : next
    setLibraryStatus(game.id, applied)
    setStatusState(applied)
  }

  const longDescription = (shown.description?.length ?? 0) > 420

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={shown.title}>
        <button className="modal__close" onClick={onClose} aria-label="Close">
          <IconClose size={17} />
        </button>

        {shown.background ? (
          <div className="modal__hero">
            <img src={shown.background} alt="" />
            <span className="modal__hero-scrim" />
            <h2 className="modal__hero-title">{shown.title}</h2>
          </div>
        ) : (
          <div className="modal__hero modal__hero--bare">
            <h2 className="modal__hero-title">{shown.title}</h2>
          </div>
        )}

        <div className="modal__body">
          <div className="modal__chips">
            {shown.genres?.map((g) => <span key={g} className="chip">{g}</span>)}
            {shown.rating != null && <span className="chip">★ {shown.rating}</span>}
            {shown.released && <span className="chip">{shown.released}</span>}
            {shown.metacritic != null && <span className="chip chip--accent">Metacritic {shown.metacritic}</span>}
            {shown.esrbRating && <span className="chip">{shown.esrbRating}</span>}
            {shown.playtime ? <span className="chip">~{shown.playtime}h average</span> : null}
          </div>

          {(shown.developers?.length > 0 || shown.publishers?.length > 0) && (
            <div className="modal__credits">
              {shown.developers?.length > 0 && <span>Developer: {shown.developers.join(', ')}</span>}
              {shown.publishers?.length > 0 && <span>Publisher: {shown.publishers.join(', ')}</span>}
            </div>
          )}

          {screenshots.length > 0 && (
            <div className="modal__screenshots">
              {screenshots.map((url) => (
                <img key={url} src={url} alt="" loading="lazy" />
              ))}
            </div>
          )}

          {shown.description && (
            <>
              <p className={`modal__description ${longDescription && !expanded ? 'modal__description--clamped' : ''}`}>
                {shown.description}
              </p>
              {longDescription && (
                <button className="modal__more" onClick={() => setExpanded((v) => !v)}>
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </>
          )}

          {score && (
            <div className="modal__stat-grid">
              <div className={`modal__stat modal__stat--${score.tier}`}>
                <label>Compatibility</label>
                <span>{TIER_LABEL[score.tier]}</span>
              </div>
              <div className="modal__stat">
                <label>Estimated FPS</label>
                <span>{score.fpsRange}</span>
              </div>
              <div className="modal__stat">
                <label>Suggested GPU</label>
                <span>{score.requiredGpuTier}</span>
              </div>
              <div className="modal__stat">
                <label>Suggested CPU</label>
                <span>{score.requiredCpuTier}</span>
              </div>
            </div>
          )}

          {aiInfo && (
            <div className="modal__ai-panel">
              <div className="modal__ai-head">
                <IconSparkle size={15} />
                AI read on your rig
                {aiInfo.hiddenGem && <span className="tier-badge tier-badge--gem tier-badge--solid">Hidden gem</span>}
              </div>
              <p className="modal__ai-explanation">{aiInfo.explanation}</p>
              <div className="modal__ai-chips">
                <span className="chip">Bottleneck: {aiInfo.bottleneck}</span>
                <span className="chip">Settings: {aiInfo.recommendedSettings}</span>
                <span className="chip">Confidence: {aiInfo.confidence}</span>
              </div>
              {aiInfo.settingsRationale && <p className="modal__ai-rationale">{aiInfo.settingsRationale}</p>}
              {aiInfo.similarGameIds?.length > 0 && (
                <div className="modal__similar">
                  <span className="modal__similar-label">Similar picks:</span>
                  {aiInfo.similarGameIds.map((id) => {
                    const similar = catalog?.[id]
                    if (!similar) return null
                    return (
                      <button key={id} className="modal__similar-btn" onClick={() => onOpenSimilar?.(similar)}>
                        {similar.title}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="modal__actions">
            {STATUSES.map(({ key, label }) => (
              <button
                key={key}
                className={status === key ? 'btn btn--active' : 'btn'}
                onClick={() => setStatus(key)}
                aria-pressed={status === key}
              >
                {label}
              </button>
            ))}
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
    </div>
  )
}
