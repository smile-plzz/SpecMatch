const TIER_LABEL = { smooth: 'Runs Smoothly', playable: 'Playable', poor: 'Not Recommended' }

export function GameCard({ game, score, onOpen, onToggleWishlist, isWishlisted }) {
  return (
    <div className={`game-card game-card--${score?.tier ?? 'unknown'}`}>
      <button className="game-card__image" onClick={() => onOpen(game)}>
        {game.background ? (
          <img src={game.background} alt={game.title} loading="lazy" />
        ) : (
          <div className="game-card__image-fallback" />
        )}
        {score && <span className={`tier-badge tier-badge--${score.tier}`}>{TIER_LABEL[score.tier]}</span>}
      </button>

      <div className="game-card__body">
        <h3 className="game-card__title" onClick={() => onOpen(game)}>{game.title}</h3>
        <div className="game-card__meta">
          <span>{game.genres?.[0] ?? 'Unknown genre'}</span>
          {game.rating != null && <span>★ {game.rating}</span>}
          {score && <span>{score.fpsRange}</span>}
        </div>
        <button
          className={`wishlist-btn ${isWishlisted ? 'wishlist-btn--active' : ''}`}
          onClick={() => onToggleWishlist(game.id)}
        >
          {isWishlisted ? '♥ Wishlisted' : '♡ Wishlist'}
        </button>
      </div>
    </div>
  )
}
