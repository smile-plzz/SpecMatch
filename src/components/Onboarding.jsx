import { useState } from 'react'
import { detectBrowserSpecs } from '../lib/specs'
import { SpecPanel } from './SpecPanel'
import { UploadReport } from './UploadReport'

export function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1)
  const [specs, setSpecs] = useState(null)
  const [error, setError] = useState(null)

  function handleDetect() {
    setSpecs(detectBrowserSpecs())
    setStep(3)
  }

  function handleUpload(uploaded) {
    setError(null)
    setSpecs(uploaded)
    setStep(3)
  }

  return (
    <div className="onboarding">
      <div className="onboarding__card">
        {step === 1 && (
          <>
            <h2>Find games your PC can actually run</h2>
            <p>SpecMatch reads your hardware and matches it against real game requirements — no more guessing if a game will run.</p>
            <button className="btn btn--primary" onClick={() => setStep(2)}>Get started</button>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Get your specs</h2>
            <p>
              For your exact CPU/GPU model, DirectX level, and refresh rate, run the
              SpecMatch scan utility (<code>utility/collect-specs.ps1</code> in the
              repo — a compiled .exe will be on GitHub Releases) and upload the
              <code> report.json</code> it writes. Nothing is uploaded automatically —
              you review the file first.
            </p>
            <UploadReport onUpload={handleUpload} onError={setError} label="Upload scan report" />
            {error && <p className="onboarding__error">{error}</p>}
            <p className="onboarding__or">or</p>
            <button className="btn" onClick={handleDetect}>Quick browser estimate instead</button>
          </>
        )}

        {step === 3 && specs && (
          <>
            <h2>Confirm your specs</h2>
            <SpecPanel specs={specs} onChange={setSpecs} />
            <button className="btn btn--primary" onClick={() => onComplete(specs)}>Show me games</button>
          </>
        )}
      </div>
    </div>
  )
}
