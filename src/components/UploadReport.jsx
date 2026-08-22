import { useRef, useState } from 'react'
import { parseUtilityReport } from '../lib/specs'
import { IconUpload } from './Icons'

const MAX_REPORT_BYTES = 64 * 1024 // report.json is a few hundred bytes normally — generous cap against abuse

export function UploadReport({ onUpload, onError, label = 'Upload scan report', variant = 'primary', dropzone = false }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  async function processFile(file) {
    if (!file) return
    if (file.size > MAX_REPORT_BYTES) {
      onError?.('That file is too large to be a SpecMatch report.')
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

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file next time
    await processFile(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    processFile(e.dataTransfer.files?.[0])
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="application/json,.json,.txt"
      onChange={handleFile}
      style={{ display: 'none' }}
    />
  )

  if (dropzone) {
    return (
      <>
        {input}
        <button
          type="button"
          className={dragOver ? 'dropzone dropzone--active' : 'dropzone'}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          disabled={busy}
        >
          <span className="proto-dropzone__icon">
            {busy ? <span className="spinner" /> : <IconUpload size={22} />}
          </span>
          <h3>{busy ? 'Reading report…' : 'Drag report file here, or click to browse'}</h3>
          <p>Accepts specmatch-report.txt · max 64KB</p>
        </button>
      </>
    )
  }

  return (
    <>
      {input}
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
