import { IconGamepad } from '../components/Icons'

export function Landing({ onCheckPC, onBrowseFirst }) {
  return (
    <div className="step-screen step-screen--narrow">
      <div className="landing-hero">
        <span className="sidebar__brand-mark landing-hero__mark"><IconGamepad size={24} /></span>
        <h1>Know if your PC can run it — before you buy.</h1>
        <p>
          Upload a one-time scan of your hardware. Search a game. Get a clear
          verdict — playable, limited, or not recommended — with the reasons
          behind it, every time.
        </p>
        <div className="landing-hero__actions">
          <button className="btn btn--primary landing-hero__cta" onClick={onCheckPC}>Check your PC</button>
          <button className="btn btn--ghost" onClick={onBrowseFirst}>Browse games first</button>
        </div>

        <div className="steps-row">
          <span className="step-pill"><span className="step-pill__num">1</span>Download utility</span>
          <span className="step-arrow">→</span>
          <span className="step-pill"><span className="step-pill__num">2</span>Upload report</span>
          <span className="step-arrow">→</span>
          <span className="step-pill"><span className="step-pill__num">3</span>Search any game</span>
        </div>
        <p className="landing-hero__privacy">No account needed. Your hardware profile stays on this device.</p>
      </div>
    </div>
  )
}
