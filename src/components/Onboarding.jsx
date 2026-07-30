import { useState } from 'react'
import { detectBrowserSpecs } from '../lib/specs'
import { SpecPanel } from './SpecPanel'
import { UploadReport } from './UploadReport'
import { IconCheck, IconGamepad } from './Icons'

const FEATURES = [
  'Runs Smoothly / Playable / Not Recommended, scored against your actual GPU, CPU, and RAM',
  'Mood and genre filters over RAWG’s full catalogue',
  'Optional AI pass that names your bottleneck and the settings to run',
]

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
        <div className="onboarding__brand">
          <span className="sidebar__brand-mark"><IconGamepad size={20} /></span>
          <h1>SPECMATCH</h1>
        </div>

        <div className="onboarding__steps" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= step ? 'onboarding__step onboarding__step--on' : 'onboarding__step'} />
          ))}
        </div>

        {step === 1 && (
          <>
            <h2>Find games your PC can actually run</h2>
            <p>
              SpecMatch reads your hardware and matches it against every game in the catalogue —
              no more guessing whether it will hold 60 FPS.
            </p>
            <div className="onboarding__features">
              {FEATURES.map((f) => (
                <div key={f} className="onboarding__feature"><IconCheck size={16} />{f}</div>
              ))}
            </div>
            <div className="onboarding__actions">
              <button className="btn btn--primary" onClick={() => setStep(2)}>Get started</button>
            </div>
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
            <div className="onboarding__actions">
              <UploadReport onUpload={handleUpload} onError={setError} label="Upload scan report" />
              {error && <p className="onboarding__error">{error}</p>}
              <p className="onboarding__or">or</p>
              <button className="btn" onClick={handleDetect}>Quick browser estimate instead</button>
            </div>
            <button className="onboarding__back" onClick={() => setStep(1)}>Back</button>
          </>
        )}

        {step === 3 && specs && (
          <>
            <h2>Confirm your specs</h2>
            <p>
              Anything wrong? Override it below — the tiers drive every recommendation you will see.
            </p>
            <SpecPanel specs={specs} onChange={setSpecs} variant="inline" />
            <div className="onboarding__actions">
              <button className="btn btn--primary" onClick={() => onComplete(specs)}>Show me games</button>
            </div>
            <button className="onboarding__back" onClick={() => setStep(2)}>Use a different source</button>
          </>
        )}
      </div>
    </div>
  )
}
