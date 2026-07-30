// Placeholder tile shown while RAWG loads — keeps the grid from collapsing and
// then jumping when results arrive.
export function GameCardSkeleton() {
  return (
    <div className="skeleton" aria-hidden="true">
      <div className="skeleton__media shimmer" />
      <div className="skeleton__body">
        <div className="skeleton__line shimmer" />
        <div className="skeleton__line skeleton__line--short shimmer" />
      </div>
    </div>
  )
}
