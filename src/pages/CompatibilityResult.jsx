import GAMES from '../data/games.json'
import { evaluateCompatibility } from '../lib/compatibility'
import { ScoreRing } from '../components/ScoreRing'
import { VerdictBadge } from '../components/VerdictBadge'
import { CompatibilityTable } from '../components/CompatibilityTable'
import { IconWarning } from '../components/Icons'

// The core screen (DESIGN_HANDOFF.md §3.6). Content order is locked:
// verdict badge -> score ring -> bottleneck -> table -> settings band ->
// source line. The score is a summary of the table, never a replacement —
// do not reorder this to lead with the score.
export function CompatibilityResult({ gameId, specs, onBack, onCompareMyPC }) {
  const game = GAMES.find((g) => g.id === gameId)

  if (!game) {
    return (
      <div className="state-card state-card--error">
        <span className="state-card__icon"><IconWarning size={20} /></span>
        <h3>Game not found</h3>
        <p>That game isn't in the curated catalogue (anymore, or yet).</p>
        <button className="btn" onClick={onBack}>Back to search</button>
      </div>
    )
  }

  const noProfile = !specs
  const result = specs ? evaluateCompatibility(specs, game) : null

  return (
    <div className="result-screen">
      <button className="btn btn--ghost btn--sm" style={{ alignSelf: 'flex-start' }} onClick={onBack}>← Back to search</button>

      <div className="result-head">
        <div className="result-head__info">
          <h2>{game.title}</h2>
          <div className="result-head__meta">{game.releaseYear} · {game.platform.join(', ')}</div>
          {!noProfile ? (
            <>
              <VerdictBadge verdict={result.verdict} />
              <span className="visually-hidden">
                {VERDICT_SENTENCE(result, game.title)}
              </span>
            </>
          ) : (
            <button className="btn btn--primary" style={{ marginTop: '0.5rem' }} onClick={onCompareMyPC}>
              Compare to my PC
            </button>
          )}
        </div>
        {!noProfile && <ScoreRing score={result.score} verdict={result.verdict} />}
      </div>

      {!noProfile && result.bottleneck && (
        <div className="bottleneck-callout">
          <IconWarning size={20} />
          <p><strong>Main bottleneck: {result.bottleneck}.</strong> Your other components clear the bar — this is the one holding performance back. See the row below for the exact gap.</p>
        </div>
      )}

      {!noProfile && result.verdict === 'insufficient-data' && (
        <div className="bottleneck-callout bottleneck-callout--unknown">
          <p>Not enough publisher-stated requirements to score this title's CPU/GPU with confidence. The comparison below still shows what we do know.</p>
        </div>
      )}

      <div>
        <h3 className="section-title">Hardware comparison</h3>
        <CompatibilityTable
          components={noProfile
            ? evaluateCompatibility({ os: {}, cpu: {}, gpu: {}, storage: {} }, game).components
            : result.components}
          noProfile={noProfile}
        />
      </div>

      {!noProfile && (
        <div className="card settings-band">
          <span className="chip chip--accent">Expected settings</span>
          <span>{result.settingsBand}</span>
        </div>
      )}

      <div className="source-line">
        Requirement data: {game.source.name}, retrieved {game.source.retrievedAt}. Estimate only — not a guaranteed frame rate.
      </div>
    </div>
  )
}

function VERDICT_SENTENCE(result, title) {
  const label = { playable: 'Playable', 'playable-limited': 'Playable with limitations', 'not-recommended': 'Not Recommended', 'insufficient-data': 'Insufficient Data' }[result.verdict]
  const scorePart = result.score != null ? `, scoring ${result.score} out of 100` : ''
  const bottleneckPart = result.bottleneck ? `. Main bottleneck: ${result.bottleneck}` : ''
  return `${title}: ${label}${scorePart}${bottleneckPart}.`
}
