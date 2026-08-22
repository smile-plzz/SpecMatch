import { useEffect, useState } from 'react'
import GAMES from '../data/games.json'
import { evaluateCompatibility } from '../lib/compatibility'
import { ScoreRing } from '../components/ScoreRing'
import { VerdictBadge } from '../components/VerdictBadge'
import { CompatibilityTable } from '../components/CompatibilityTable'
import { fetchGameDetails, fetchGameScreenshots, enrichGame, rawgThumb } from '../lib/rawg'
import { IconGamepad, IconWarning } from '../components/Icons'

const VERIFIED_BY_TITLE = new Map(GAMES.map((g) => [g.title.toLowerCase(), g]))

// The core screen (DESIGN_HANDOFF.md §3.6). Content order is locked:
// verdict badge -> score ring -> bottleneck -> table -> settings band ->
// source line. The score is a summary of the table, never a replacement —
// do not reorder this to lead with the score.
//
// `game` is now a live RAWG-shaped object (from GameSearch's live query),
// not a local dataset row — search discovery is live, but real min/rec
// requirements only exist for the small curated set. If this game doesn't
// resolve to a curated entry, that's said plainly, never faked.
export function CompatibilityResult({ game, specs, onBack, onCompareMyPC }) {
  const [detail, setDetail] = useState(game)
  const [screenshots, setScreenshots] = useState([])
  const [descExpanded, setDescExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    setDetail(game)
    setScreenshots([])
    if (!game?.id) return
    fetchGameDetails(game.id).then((raw) => { if (!cancelled) setDetail(enrichGame(raw)) }).catch(() => {})
    fetchGameScreenshots(game.id).then((urls) => { if (!cancelled) setScreenshots(urls) }).catch(() => {})
    return () => { cancelled = true }
  }, [game?.id])

  if (!game) {
    return (
      <div className="state-card state-card--error">
        <span className="state-card__icon"><IconWarning size={20} /></span>
        <h3>Game not found</h3>
        <p>That search result is no longer available.</p>
        <button className="btn" onClick={onBack}>Back to search</button>
      </div>
    )
  }

  const verified = VERIFIED_BY_TITLE.get(game.title.toLowerCase())
  const noProfile = !specs
  const result = verified && specs ? evaluateCompatibility(specs, verified) : null
  const background = detail?.background || game.background
  const longDescription = (detail?.description?.length ?? 0) > 420

  return (
    <div className="result-screen">
      <button className="btn btn--ghost btn--sm" style={{ alignSelf: 'flex-start' }} onClick={onBack}>← Back to search</button>

      <div className="result-head">
        {background ? (
          <img className="result-head__art" src={rawgThumb(background)} alt="" />
        ) : (
          <div className="result-head__art result-head__art--fallback"><IconGamepad size={28} /></div>
        )}
        <div className="result-head__info">
          <h2>{game.title}</h2>
          <div className="result-head__meta">
            {game.released ? new Date(game.released).getFullYear() : 'Unknown year'} · {game.platforms?.join(', ') || 'Unknown platform'}
          </div>
          {verified ? (
            noProfile ? (
              <button className="btn btn--primary" style={{ marginTop: '0.5rem' }} onClick={onCompareMyPC}>
                Compare to my PC
              </button>
            ) : (
              <>
                <VerdictBadge verdict={result.verdict} />
                <span className="visually-hidden">{VERDICT_SENTENCE(result, game.title)}</span>
              </>
            )
          ) : (
            <VerdictBadge verdict="insufficient-data" />
          )}
        </div>
        {verified && !noProfile && <ScoreRing score={result.score} verdict={result.verdict} />}
      </div>

      {!verified && (
        <div className="bottleneck-callout bottleneck-callout--unknown">
          <IconWarning size={20} />
          <p>
            <strong>No verified system requirements for this title yet.</strong> SpecMatch only scores games we've
            sourced real minimum/recommended specs for — this one isn't in that set. We won't guess a verdict for it.
          </p>
        </div>
      )}

      {verified && !noProfile && result.bottleneck && (
        <div className="bottleneck-callout">
          <IconWarning size={20} />
          <p><strong>Main bottleneck: {result.bottleneck}.</strong> Your other components clear the bar — this is the one holding performance back. See the row below for the exact gap.</p>
        </div>
      )}

      {verified && !noProfile && result.verdict === 'insufficient-data' && (
        <div className="bottleneck-callout bottleneck-callout--unknown">
          <p>Not enough publisher-stated requirements to score this title's CPU/GPU with confidence. The comparison below still shows what we do know.</p>
        </div>
      )}

      {verified && (
        <div>
          <h3 className="section-title">Hardware comparison</h3>
          <CompatibilityTable
            components={noProfile
              ? evaluateCompatibility({ os: {}, cpu: {}, gpu: {}, storage: {} }, verified).components
              : result.components}
            noProfile={noProfile}
          />
        </div>
      )}

      {verified && !noProfile && (
        <div className="card settings-band">
          <span className="chip chip--accent">Expected settings</span>
          <span>{result.settingsBand}</span>
        </div>
      )}

      {verified && (
        <div className="source-line">
          Requirement data: {verified.source.name}, retrieved {verified.source.retrievedAt}. Estimate only — not a guaranteed frame rate.
        </div>
      )}

      {detail && (
        <div className="about-game">
          <h3 className="section-title">About this game</h3>

          <div className="modal__chips">
            {detail.genres?.map((g) => <span key={g} className="chip">{g}</span>)}
            {detail.rating != null && <span className="chip">★ {detail.rating}</span>}
            {detail.released && <span className="chip">{detail.released}</span>}
            {detail.metacritic != null && <span className="chip chip--accent">Metacritic {detail.metacritic}</span>}
            {detail.esrbRating && <span className="chip">{detail.esrbRating}</span>}
            {detail.playtime ? <span className="chip">~{detail.playtime}h average playtime</span> : null}
          </div>

          {(detail.developers?.length > 0 || detail.publishers?.length > 0) && (
            <div className="modal__credits">
              {detail.developers?.length > 0 && <span>Developer: {detail.developers.join(', ')}</span>}
              {detail.publishers?.length > 0 && <span>Publisher: {detail.publishers.join(', ')}</span>}
            </div>
          )}

          {screenshots.length > 0 && (
            <div className="modal__screenshots">
              {screenshots.map((url) => <img key={url} src={url} alt="" loading="lazy" />)}
            </div>
          )}

          {detail.description && (
            <>
              <p className={`modal__description ${longDescription && !descExpanded ? 'modal__description--clamped' : ''}`}>
                {detail.description}
              </p>
              {longDescription && (
                <button className="modal__more" onClick={() => setDescExpanded((v) => !v)}>
                  {descExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </>
          )}

          {(detail.storeLinks?.length > 0 || detail.website || detail.trailer) && (
            <div className="modal__stores">
              {detail.website && <a href={detail.website} target="_blank" rel="noreferrer">Website</a>}
              {detail.trailer && <a href={detail.trailer.url} target="_blank" rel="noreferrer">Trailer</a>}
              {detail.storeLinks?.map((store) => (
                <a key={store.url} href={store.url} target="_blank" rel="noreferrer">{store.name ?? 'Store link'}</a>
              ))}
            </div>
          )}

          <p className="about-game__attribution">Live game info via RAWG — informational only, not part of the compatibility verdict above.</p>
        </div>
      )}
    </div>
  )
}

function VERDICT_SENTENCE(result, title) {
  const label = { playable: 'Playable', 'playable-limited': 'Playable with limitations', 'not-recommended': 'Not Recommended', 'insufficient-data': 'Insufficient Data' }[result.verdict]
  const scorePart = result.score != null ? `, scoring ${result.score} out of 100` : ''
  const bottleneckPart = result.bottleneck ? `. Main bottleneck: ${result.bottleneck}` : ''
  return `${title}: ${label}${scorePart}${bottleneckPart}.`
}
