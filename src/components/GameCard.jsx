import { rawgThumb } from '../lib/rawg'
import { IconGamepad, IconHeart } from './Icons'

const TIER_LABEL = { smooth: 'Runs smoothly', playable: 'Playable', poor: 'Not recommended' }

export function GameCard({ game, score, onOpen, onToggleWishlist, isWishlisted, hiddenGem }) {
  const year = game.released ? new Date(game.released).getFullYear() : null

  return (
    <article className={`game-card game-card--${score?.tier ?? 'unknown'}`}>
      <button className="game-card__media" onClick={() => onOpen(game)} aria-label={`Open ${game.title}`}>
        {game.background ? (
          <img src={rawgThumb(game.background)} alt="" loading="lazy" />
        ) : (
          <div className="game-card__media-fallback"><IconGamepad size={28} /></div>
        )}
        <span className="game-card__scrim" />
        <span className="game-card__badges">
          {score && (
            <span className={`tier-badge tier-badge--${score.tier}`}>
              <span className="tier-badge__dot" />
              {TIER_LABEL[score.tier]}
            </span>
          )}
          {hiddenGem && <span className="tier-badge tier-badge--gem">Hidden gem</span>}
        </span>
      </button>

      <button
        className={`game-card__fav ${isWishlisted ? 'game-card__fav--active' : ''}`}
        onClick={() => onToggleWishlist(game.id)}
        aria-label={isWishlisted ? `Remove ${game.title} from wishlist` : `Add ${game.title} to wishlist`}
        aria-pressed={isWishlisted}
        title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <IconHeart size={16} filled={isWishlisted} />
      </button>

      <div className="game-card__body">
        <button className="game-card__title" onClick={() => onOpen(game)}>{game.title}</button>
        <div className="game-card__meta">
          <span>{game.genres?.[0] ?? 'Unknown genre'}</span>
          {year && <><span className="dot" /><span>{year}</span></>}
          {game.rating != null && <><span className="dot" /><span>★ {game.rating}</span></>}
        </div>
        {score && <div className="game-card__meta game-card__fps">{score.fpsRange} on your PC</div>}
      </div>
    </article>
  )
}
