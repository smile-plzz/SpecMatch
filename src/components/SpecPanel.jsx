import { useState } from 'react'
import { CPU_TIERS, GPU_TIERS } from '../lib/specs'
import { UploadReport } from './UploadReport'
import { IconChip, IconClose } from './Icons'

// `variant="inline"` is the onboarding confirmation step (sits inside a card);
// the default is the app-shell strip under the topbar.
export function SpecPanel({ specs, onChange, variant = 'bar' }) {
  const [editing, setEditing] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  if (!specs) return null

  function handleRescan(uploaded) {
    setUploadError(null)
    onChange(uploaded)
  }

  const display = specs.display
  const resolution = display?.width && display?.height ? `${display.width}×${display.height}` : null

  return (
    <div className={variant === 'inline' ? 'spec-panel spec-panel--inline' : 'spec-panel'}>
      <div className="spec-panel__summary">
        <div className="spec-stat spec-stat--source">
          <label>Source</label>
          <span>{specs.source === 'utility' ? 'Desktop scan' : 'Browser estimate'}</span>
        </div>
        <div className="spec-stat">
          <label>GPU</label>
          <span title={specs.gpu?.model ?? undefined}>{specs.gpu?.model ?? `~${specs.gpu?.tier ?? 'unknown'}`}</span>
        </div>
        <div className="spec-stat">
          <label>CPU</label>
          <span title={specs.cpu?.model ?? undefined}>
            {specs.cpu?.model ?? `${specs.cpu?.cores ?? '?'} cores (~${specs.cpu?.tier ?? 'unknown'})`}
          </span>
        </div>
        <div className="spec-stat">
          <label>RAM</label>
          <span>{specs.ramGB ? `${specs.ramGB} GB` : 'Unknown'}</span>
        </div>
        <div className="spec-stat">
          <label>OS</label>
          <span>{specs.os?.name ?? 'Unknown'}</span>
        </div>
        {resolution && (
          <div className="spec-stat">
            <label>Display</label>
            <span>{resolution}{display.refreshHz ? ` @ ${display.refreshHz}Hz` : ''}</span>
          </div>
        )}

        <button className="btn btn--sm spec-panel__edit" onClick={() => setEditing((v) => !v)}>
          {editing ? <><IconClose size={15} /> Close</> : <><IconChip size={15} /> Edit specs</>}
        </button>
      </div>

      {editing && (
        <div className="spec-panel__edit-form">
          <label>
            GPU tier
            <select
              className="field"
              value={specs.gpu?.tier ?? 'mid'}
              onChange={(e) => onChange({ ...specs, gpu: { ...specs.gpu, tier: e.target.value } })}
            >
              {GPU_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>
            CPU tier
            <select
              className="field"
              value={specs.cpu?.tier ?? 'mid'}
              onChange={(e) => onChange({ ...specs, cpu: { ...specs.cpu, tier: e.target.value } })}
            >
              {CPU_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>
            RAM (GB)
            <input
              className="field"
              type="number"
              min="1"
              value={specs.ramGB ?? ''}
              onChange={(e) => onChange({ ...specs, ramGB: Number(e.target.value) || null })}
            />
          </label>
          <div className="spec-panel__rescan">
            <UploadReport
              onUpload={handleRescan}
              onError={setUploadError}
              label="Upload new scan report"
              variant="secondary"
            />
            {uploadError && <p className="onboarding__error">{uploadError}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
