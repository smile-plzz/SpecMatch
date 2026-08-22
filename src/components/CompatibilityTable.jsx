// One component, two renderings of the same data (table on desktop, stacked
// cards on mobile via CSS, not two React components) — per
// DESIGN_HANDOFF.md §4's explicit "do not build two separate components for
// one dataset" instruction. The breakpoint is a CSS media query in
// globals.css (`.compat-table-wrap`), not JS, so there's no layout flash.
const STATUS_LABEL = { pass: 'Meets', partial: 'Partial', fail: 'Below', unknown: 'Unknown' }

export function CompatibilityTable({ components, noProfile = false }) {
  return (
    <div className="compat-table-wrap">
      <table className="compat-table compat-table--desktop">
        <thead>
          <tr><th>Component</th><th>Your system</th><th>Requirement</th><th>Result</th></tr>
        </thead>
        <tbody>
          {components.map((c) => (
            <tr key={c.label}>
              <td>{c.label}</td>
              <td>{noProfile ? '—' : c.you}</td>
              <td>{c.need}</td>
              <td className={`verdict--${c.status}`}>{STATUS_LABEL[c.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="compat-table--stacked">
        {components.map((c) => (
          <div className="compat-card" key={c.label}>
            <div className="compat-card__head">
              <span>{c.label}</span>
              <span className={`verdict--${c.status}`}>{STATUS_LABEL[c.status]}</span>
            </div>
            <div className="compat-card__row"><label>Your system</label><span>{noProfile ? '—' : c.you}</span></div>
            <div className="compat-card__row"><label>Requirement</label><span>{c.need}</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}
