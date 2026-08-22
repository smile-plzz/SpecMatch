import { useState } from 'react'
import { UploadReport } from '../components/UploadReport'
import { ManualSpecEntry } from '../components/ManualSpecEntry'
import { StepHeader } from './SystemSetup'
import { IconCheck, IconWarning } from '../components/Icons'

export function UploadReportScreen({ onComplete }) {
  const [mode, setMode] = useState('file') // 'file' | 'manual' — switching resets in-progress state (DESIGN_HANDOFF.md §7)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState(null)

  function switchMode(next) {
    setMode(next)
    setParsed(null)
    setError(null)
  }

  return (
    <div className="step-screen step-screen--narrow">
      <StepHeader step={2} title="Upload your system report" />
      <p className="step-screen__lede">
        Drop the report file the utility generated, or enter your hardware
        manually. Either way, it's processed in your browser — only the
        structured fields below are stored.
      </p>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'file'} className={mode === 'file' ? 'tab tab--active' : 'tab'} onClick={() => switchMode('file')}>Upload file</button>
        <button role="tab" aria-selected={mode === 'manual'} className={mode === 'manual' ? 'tab tab--active' : 'tab'} onClick={() => switchMode('manual')}>Enter manually</button>
      </div>

      {mode === 'file' && (
        <>
          {!parsed && (
            <UploadReport
              dropzone
              onUpload={(specs) => { setError(null); setParsed(specs) }}
              onError={(msg) => setError(msg)}
            />
          )}

          {parsed && (
            <>
              <div className="file-row">
                <IconCheck size={20} />
                <div>
                  <div className="file-row__name">Report accepted</div>
                  <div className="file-row__meta">
                    reportVersion {parsed.reportVersion} · {['os', 'cpu', 'gpu', 'ramGB', 'storage', 'display', 'directx'].filter((k) => parsed[k]).length}/7 fields parsed
                  </div>
                </div>
                <div className="file-row__spacer" />
                <button className="btn btn--sm btn--ghost" onClick={() => setParsed(null)}>Replace</button>
              </div>
              <button className="btn btn--primary" style={{ alignSelf: 'flex-start' }} onClick={() => onComplete(parsed)}>
                Continue to profile
              </button>
            </>
          )}

          {error && (
            <div className="state-card state-card--error">
              <span className="state-card__icon"><IconWarning size={20} /></span>
              <h3>Couldn't read that file</h3>
              <p>{error}</p>
              <div className="step-screen__actions-row">
                <button className="btn btn--sm" onClick={() => setError(null)}>Try another file</button>
              </div>
            </div>
          )}
        </>
      )}

      {mode === 'manual' && (
        <ManualSpecEntry onSubmit={onComplete} />
      )}
    </div>
  )
}
