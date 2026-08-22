import { IconCheck, IconWarning, IconClose, IconSearch } from './Icons'

// 4-state verdict badge (DESIGN_HANDOFF.md §11, LOCKED): Insufficient Data
// must never render in the red/amber/green palette used by the other three,
// so it gets its own `--unknown`/`--unknown-soft` token pair (added to
// globals.css) rather than reusing `--text-dim`.
export const VERDICT_META = {
  playable: { label: 'Playable', cls: 'smooth', Icon: IconCheck },
  'playable-limited': { label: 'Playable with limitations', cls: 'playable', Icon: IconWarning },
  'not-recommended': { label: 'Not Recommended', cls: 'poor', Icon: IconClose },
  'insufficient-data': { label: 'Insufficient Data', cls: 'unknown', Icon: IconSearch },
}

export function VerdictBadge({ verdict, size = 'md' }) {
  const meta = VERDICT_META[verdict]
  if (!meta) return null
  const { label, cls, Icon } = meta
  return (
    <span className={`verdict-badge verdict-badge--${cls} verdict-badge--${size}`}>
      <Icon size={size === 'sm' ? 12 : 16} /> {label}
    </span>
  )
}

export function VerdictDot({ verdict }) {
  const meta = VERDICT_META[verdict]
  if (!meta) return null
  return <span className={`verdict-dot verdict-dot--${meta.cls}`} title={meta.label} aria-label={meta.label} />
}
