import { useState } from 'react'
import { CPU_TIERS, GPU_TIERS } from '../lib/specs'

export function SpecPanel({ specs, onChange }) {
  const [editing, setEditing] = useState(false)

  if (!specs) return null

  return (
    <div className="spec-panel">
      <div className="spec-panel__summary">
        <div><label>Source</label><span>{specs.source === 'utility' ? 'Desktop scan' : 'Browser estimate'}</span></div>
        <div><label>GPU</label><span>{specs.gpu?.model ?? `~${specs.gpu?.tier}`}</span></div>
        <div><label>CPU</label><span>{specs.cpu?.model ?? `${specs.cpu?.cores ?? '?'} cores (~${specs.cpu?.tier})`}</span></div>
        <div><label>RAM</label><span>{specs.ramGB ? `${specs.ramGB} GB` : 'Unknown'}</span></div>
        <div><label>OS</label><span>{specs.os?.name ?? 'Unknown'}</span></div>
        <button className="spec-panel__edit" onClick={() => setEditing((v) => !v)}>
          {editing ? 'Close' : 'Edit'}
        </button>
      </div>

      {editing && (
        <div className="spec-panel__edit-form">
          <label>
            GPU tier
            <select
              value={specs.gpu?.tier ?? 'mid'}
              onChange={(e) => onChange({ ...specs, gpu: { ...specs.gpu, tier: e.target.value } })}
            >
              {GPU_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>
            CPU tier
            <select
              value={specs.cpu?.tier ?? 'mid'}
              onChange={(e) => onChange({ ...specs, cpu: { ...specs.cpu, tier: e.target.value } })}
            >
              {CPU_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>
            RAM (GB)
            <input
              type="number"
              min="1"
              value={specs.ramGB ?? ''}
              onChange={(e) => onChange({ ...specs, ramGB: Number(e.target.value) || null })}
            />
          </label>
        </div>
      )}
    </div>
  )
}
