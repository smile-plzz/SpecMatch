import { getLibrary, setLibraryStatus } from '../lib/store'

const TIER_LABEL = { smooth: 'Runs Smoothly', playable: 'Playable', poor: 'Not Recommended' }

export function GameDetailModal({ game, score, aiInfo, onClose }) {
  if (!game) return null
  const library = getLibrary()
  const status = library[game.id]

  function setStatus(next) {
    setLibraryStatus(game.id, status === next ? null : next)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose}>×</button>
        {game.background && <img className="modal__image" src={game.background} alt={game.title} />}
        <h2>{game.title}</h2>

        <div className="modal__meta">
          <span>{game.genres?.join(', ')}</span>
          {game.rating != null && <span>★ {game.rating}</span>}
          {game.released && <span>{game.released}</span>}
        </div>

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

        {game.storeLinks?.length > 0 && (
          <div className="modal__stores">
            {game.storeLinks.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">Store link</a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
