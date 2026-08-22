import { IconChip, IconMonitor, IconRefresh } from '../components/Icons'
import { StepHeader } from './SystemSetup'

export function SystemProfileScreen({ specs, onRescan, onSearch }) {
  const storageFree = Array.isArray(specs.storage)
    ? specs.storage.reduce((s, d) => s + (d.freeGB || 0), 0)
    : specs.storage?.freeGB

  return (
    <div className="step-screen step-screen--narrow">
      <StepHeader step={3} title="Your system profile" />
      <p className="step-screen__lede">
        This is what we'll compare against every game you search. You won't
        need to upload again — rescan any time from here.
      </p>

      <div className="profile-grid">
        <ProfileStat icon={<IconMonitor size={14} />} label="Operating system" value={specs.os?.name || 'Unknown'} />
        <ProfileStat icon={<IconChip size={14} />} label="Processor" value={specs.cpu?.model || 'Unknown'} />
        <ProfileStat icon={<IconChip size={14} />} label="Graphics" value={specs.gpu?.model || 'Unknown'} />
        <ProfileStat icon={<IconChip size={14} />} label="Memory" value={specs.ramGB ? `${specs.ramGB} GB RAM` : 'Unknown'} />
        <ProfileStat icon={<IconMonitor size={14} />} label="Storage" value={storageFree ? `${storageFree} GB free` : 'Unknown'} />
        <ProfileStat icon={<IconMonitor size={14} />} label="Graphics API" value={specs.directx ? `DirectX ${specs.directx}` : 'Unknown'} />
      </div>

      <div className="step-screen__actions-row">
        <button className="btn" onClick={onRescan}><IconRefresh size={16} /> Rescan / upload new report</button>
      </div>

      <button className="btn btn--primary" style={{ alignSelf: 'flex-start', padding: '0.75rem 1.6rem' }} onClick={onSearch}>
        Search for a game
      </button>
    </div>
  )
}

function ProfileStat({ icon, label, value }) {
  return (
    <div className="profile-stat">
      <span className="profile-stat__label">{icon} {label}</span>
      <span className="profile-stat__value">{value}</span>
    </div>
  )
}
