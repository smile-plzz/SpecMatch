import { useState } from 'react'
import { detectBrowserSpecs } from '../lib/specs'
import { SpecPanel } from './SpecPanel'

export function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1)
  const [specs, setSpecs] = useState(null)

  function handleDetect() {
    setSpecs(detectBrowserSpecs())
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
            <h2>Detect your specs</h2>
            <p>
              A quick browser estimate works now (CPU cores, RAM, rough GPU). For exact
              CPU/GPU model, DirectX level, and refresh rate, the desktop scan utility
              is coming soon — this quick estimate is a fine starting point.
            </p>
            <button className="btn btn--primary" onClick={handleDetect}>Detect in browser</button>
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
