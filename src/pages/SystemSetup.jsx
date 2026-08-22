import { IconCheck, IconClose, IconUpload } from '../components/Icons'

export function SystemSetup({ onContinue, onUseBrowserEstimate }) {
  return (
    <div className="step-screen step-screen--narrow">
      <StepHeader step={1} title="Run a quick, local scan" />
      <p className="step-screen__lede">
        A small utility reads your hardware locally and writes a report file.
        Nothing is uploaded automatically — you choose when to share it.
      </p>

      <div className="setup-columns">
        <div className="card setup-card">
          <h3>What we collect</h3>
          <ul className="setup-list setup-list--collect">
            <li><IconCheck size={16} /> CPU model, cores/threads</li>
            <li><IconCheck size={16} /> GPU model, VRAM, driver version</li>
            <li><IconCheck size={16} /> RAM amount</li>
            <li><IconCheck size={16} /> OS name/version, architecture</li>
            <li><IconCheck size={16} /> Free storage, display, DirectX version</li>
          </ul>
        </div>
        <div className="card setup-card">
          <h3>What we never collect</h3>
          <ul className="setup-list setup-list--skip">
            <li><IconClose size={16} /> Your name, username, or hostname</li>
            <li><IconClose size={16} /> Serial numbers or MAC addresses</li>
            <li><IconClose size={16} /> Files, browsing, or personal data</li>
            <li><IconClose size={16} /> Anything sent without your action</li>
          </ul>
        </div>
      </div>

      <div className="step-screen__actions-row">
        <a href="https://raw.githubusercontent.com/smile-plzz/SpecMatch/main/utility/collect-specs.ps1" className="btn btn--primary" download>
          <IconUpload size={17} /> Download scan utility (.ps1)
        </a>
        <a href="https://github.com/smile-plzz/SpecMatch/blob/main/utility/collect-specs.ps1" className="btn btn--ghost" target="_blank" rel="noreferrer">
          View script source
        </a>
      </div>

      <div className="step-screen__divider">
        <button className="btn" onClick={onContinue}>I've run it — continue to upload</button>
      </div>

      <button className="step-screen__skip-link" onClick={onUseBrowserEstimate}>
        Use a rough in-browser estimate instead
      </button>
    </div>
  )
}

export function StepHeader({ step, total = 3, title }) {
  return (
    <div>
      <span className="eyebrow">Step {step} of {total}</span>
      <h2 className="step-screen__title">{title}</h2>
    </div>
  )
}
