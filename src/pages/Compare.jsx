import { useState } from 'react'
import { searchGames, enrichGame } from '../lib/rawg'
import { scoreGameForSpecs } from '../lib/scoring'

export function Compare({ specs }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    const data = await searchGames(query)
    setResults((data.results || []).map(enrichGame))
  }

  const score = selected && specs ? scoreGameForSpecs(selected, specs) : null

  return (
    <div className="compare">
      <form className="compare__search" onSubmit={handleSearch}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a game to compare..." />
        <button type="submit" className="btn">Search</button>
      </form>

      <div className="compare__results">
        {results.map((g) => (
          <button key={g.id} className="compare__result" onClick={() => setSelected(g)}>{g.title}</button>
        ))}
      </div>

      {selected && specs && (
        <table className="compat-table compat-table--wide">
          <thead>
            <tr><th></th><th>Your PC</th><th>{selected.title} (estimated)</th></tr>
          </thead>
          <tbody>
            <tr><td>GPU tier</td><td>{specs.gpu?.tier}</td><td>{score.requiredGpuTier}</td></tr>
            <tr><td>CPU tier</td><td>{specs.cpu?.tier}</td><td>{score.requiredCpuTier}</td></tr>
            <tr><td>RAM</td><td>{specs.ramGB ? `${specs.ramGB} GB` : 'Unknown'}</td><td>{score.ramOk ? 'Sufficient' : 'May be insufficient'}</td></tr>
            <tr><td>Verdict</td><td colSpan={2}>{score.fpsRange} ({score.tier})</td></tr>
          </tbody>
        </table>
      )}
    </div>
  )
}
