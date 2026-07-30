import { useRef, useState } from 'react'
import { parseUtilityReport } from '../lib/specs'
import { IconUpload } from './Icons'

const MAX_REPORT_BYTES = 64 * 1024 // report.json is a few hundred bytes normally — generous cap against abuse

export function UploadReport({ onUpload, onError, label = 'Upload scan report', variant = 'primary' }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file next time
    if (!file) return

    if (file.size > MAX_REPORT_BYTES) {
      onError?.('That file is too large to be a SpecMatch report.json.')
      return
    }

    setBusy(true)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const specs = parseUtilityReport(json)
      onUpload(specs)
    } catch (err) {
      onError?.(`Could not read report: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      <button
        className={variant === 'primary' ? 'btn btn--primary' : 'btn'}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <><span className="spinner" /> Reading…</> : <><IconUpload size={16} /> {label}</>}
      </button>
    </>
  )
}
