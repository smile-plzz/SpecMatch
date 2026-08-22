import { useState } from 'react'
import { buildManualSpecs } from '../lib/specs'

// Equal-weight alternative to file upload (DESIGN_HANDOFF.md §11, LOCKED —
// this was an explicit reversal of the original plan's "small link" framing).
// Produces the same profile shape `parseUtilityReport` does, tagged
// `source: 'manual'`, so nothing downstream needs to special-case it.
export function ManualSpecEntry({ onSubmit }) {
  const [form, setForm] = useState({ osName: 'Windows 11', cpuModel: '', gpuModel: '', ramGB: '', vramGB: '', directx: '12' })

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit(buildManualSpecs({
      osName: form.osName,
      cpuModel: form.cpuModel.trim() || null,
      gpuModel: form.gpuModel.trim() || null,
      ramGB: Number(form.ramGB) || null,
      vramGB: Number(form.vramGB) || null,
      directx: form.directx,
    }))
  }

  const canSubmit = form.cpuModel.trim() && form.gpuModel.trim() && form.ramGB

  return (
    <form className="manual-entry" onSubmit={handleSubmit}>
      <label>
        Operating system
        <select className="field" value={form.osName} onChange={(e) => set('osName', e.target.value)}>
          <option>Windows 11</option>
          <option>Windows 10</option>
          <option>Windows 7</option>
          <option>macOS</option>
          <option>Linux</option>
        </select>
      </label>
      <label>
        CPU model
        <input className="field" placeholder="e.g. Ryzen 5 5600X" value={form.cpuModel} onChange={(e) => set('cpuModel', e.target.value)} />
      </label>
      <label>
        GPU model
        <input className="field" placeholder="e.g. RTX 3060" value={form.gpuModel} onChange={(e) => set('gpuModel', e.target.value)} />
      </label>
      <label>
        RAM (GB)
        <input className="field" type="number" min="1" value={form.ramGB} onChange={(e) => set('ramGB', e.target.value)} />
      </label>
      <label>
        VRAM (GB, optional)
        <input className="field" type="number" min="0" value={form.vramGB} onChange={(e) => set('vramGB', e.target.value)} />
      </label>
      <label>
        DirectX version
        <select className="field" value={form.directx} onChange={(e) => set('directx', e.target.value)}>
          <option value="12">DirectX 12</option>
          <option value="11">DirectX 11</option>
          <option value="10">DirectX 10</option>
        </select>
      </label>
      <button type="submit" className="btn btn--primary" disabled={!canSubmit}>Use these specs</button>
    </form>
  )
}
