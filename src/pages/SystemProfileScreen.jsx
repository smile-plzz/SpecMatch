import { IconChip, IconGamepad, IconMonitor, IconRefresh } from '../components/Icons'
import { StepHeader } from './SystemSetup'

export function SystemProfileScreen({ specs, onRescan, onSearch }) {
  const storageFree = Array.isArray(specs.storage)
    ? specs.storage.reduce((s, d) => s + (d.freeGB || 0), 0)
    : specs.storage?.freeGB

  const gpuLabel = specs.gpu?.model
    ? `${specs.gpu.model}${specs.gpu.integrated === false ? ' (discrete)' : specs.gpu.integrated === true ? ' (integrated)' : ''}`
    : 'Unknown'
  const ramLabel = specs.ramGB
    ? `${specs.ramGB} GB RAM${specs.ram?.type ? ` ${specs.ram.type}` : ''}`
    : 'Unknown'

  return (
    <div className="step-screen step-screen--narrow">
      <StepHeader step={3} title="Your system profile" />
      <p className="step-screen__lede">
        This is what we'll compare against every game you search. You won't
        need to upload again — rescan any time from here.
      </p>

      {specs.formFactor?.isLaptop && (
        <div className="chip chip--accent" style={{ alignSelf: 'flex-start' }}>Laptop detected</div>
      )}

      <div className="profile-grid">
        <ProfileStat icon={<IconMonitor size={14} />} label="Operating system" value={specs.os?.name || 'Unknown'} />
        <ProfileStat icon={<IconChip size={14} />} label="Processor" value={specs.cpu?.model || 'Unknown'} sub={specs.cpu?.cores ? `${specs.cpu.cores}c / ${specs.cpu.threads}t` : null} />
        <ProfileStat icon={<IconGamepad size={14} />} label="Graphics" value={gpuLabel} />
        <ProfileStat icon={<IconChip size={14} />} label="Memory" value={ramLabel} />
        <ProfileStat icon={<IconMonitor size={14} />} label="Storage" value={storageFree ? `${storageFree} GB free` : 'Unknown'} sub={specs.storage?.type} />
        <ProfileStat icon={<IconMonitor size={14} />} label="Graphics API" value={specs.directx ? `DirectX ${specs.directx}` : 'Unknown'} sub={specs.directxInfo?.wddmVersion} />
      </div>

      {specs.integratedGpu && (
        <p className="about-game__attribution">
          Also detected: {specs.integratedGpu.model} (integrated) — the discrete GPU above is used for compatibility scoring since that's what games actually run on.
        </p>
      )}

      <div className="step-screen__actions-row">
        <button className="btn" onClick={onRescan}><IconRefresh size={16} /> Rescan / upload new report</button>
      </div>

      <button className="btn btn--primary" style={{ alignSelf: 'flex-start', padding: '0.75rem 1.6rem' }} onClick={onSearch}>
        Search for a game
      </button>
    </div>
  )
}

function ProfileStat({ icon, label, value, sub }) {
  return (
    <div className="profile-stat">
      <span className="profile-stat__label">{icon} {label}</span>
      <span className="profile-stat__value">{value}</span>
      {sub && <span className="profile-stat__sub">{sub}</span>}
    </div>
  )
}
