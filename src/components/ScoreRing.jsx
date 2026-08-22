// 0-100 conic-gradient ring. Technique per DESIGN_HANDOFF.md §4/§11 (FLEXIBLE
// on conic-gradient vs SVG stroke — conic-gradient chosen here to match the
// design reference and avoid an extra SVG dependency for a simple ring).
const RING_COLOR = {
  playable: 'var(--smooth)',
  'playable-limited': 'var(--playable)',
  'not-recommended': 'var(--poor)',
  'insufficient-data': 'var(--unknown)',
}

export function ScoreRing({ score, verdict }) {
  const pct = score ?? 0
  const color = RING_COLOR[verdict] || 'var(--accent)'
  const title = score == null
    ? 'Not enough data to compute a score'
    : `${score} / 100 — weighted comparison of GPU, CPU, RAM and VRAM against this game's requirements. An estimate, not a guaranteed frame rate.`

  return (
    <div className="score-ring" style={{ '--pct': pct, '--ring-color': color }} title={title}>
      <div className="score-ring__inner">
        <span className="score-ring__num">{score ?? '—'}</span>
        <span className="score-ring__pct">/ 100</span>
      </div>
    </div>
  )
}
