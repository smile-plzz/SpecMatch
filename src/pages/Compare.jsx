import { useState } from 'react'
import { searchGames, enrichGame } from '../lib/rawg'
import { scoreGameForSpecs } from '../lib/scoring'
import { IconCompare, IconSearch, IconWarning } from '../components/Icons'

const TIER_LABEL = { smooth: 'Runs smoothly', playable: 'Playable', poor: 'Not recommended' }

export function Compare({ specs }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setError(null)
    try {
      const data = await searchGames(query)
      setResults((data.results || []).map(enrichGame))
    } catch (err) {
      setError(err.message)
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const score = selected && specs ? scoreGameForSpecs(selected, specs) : null

  return (
    <div className="compare">
      <form className="compare__search" onSubmit={handleSearch}>
        <div className="search-field">
          <IconSearch size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a game to compare…"
            aria-label="Search a game to compare"
          />
        </div>
        <button type="submit" className="btn btn--primary" disabled={searching || !query.trim()}>
          {searching ? <><span className="spinner" /> Searching…</> : 'Search'}
        </button>
      </form>

      {error && (
        <div className="state-card state-card--error">
          <span className="state-card__icon"><IconWarning size={22} /></span>
          <h3>Search failed</h3>
          <p>{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="compare__results">
          {results.map((g) => (
            <button
              key={g.id}
              className={`compare__result ${selected?.id === g.id ? 'compare__result--active' : ''}`}
              onClick={() => setSelected(g)}
            >
              {g.title}
            </button>
          ))}
        </div>
      )}

      {selected && specs && (
        <table className="compat-table">
          <thead>
            <tr>
              <th></th>
              <th>Your PC</th>
              <th>{selected.title} (estimated)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>GPU tier</td><td>{specs.gpu?.tier}</td><td>{score.requiredGpuTier}</td></tr>
            <tr><td>CPU tier</td><td>{specs.cpu?.tier}</td><td>{score.requiredCpuTier}</td></tr>
            <tr>
              <td>RAM</td>
              <td>{specs.ramGB ? `${specs.ramGB} GB` : 'Unknown'}</td>
              <td>{score.ramOk ? 'Sufficient' : 'May be insufficient'}</td>
            </tr>
            <tr>
              <td>Verdict</td>
              <td colSpan={2} className={`verdict--${score.tier}`}>
                {TIER_LABEL[score.tier]} — {score.fpsRange}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {!selected && results.length === 0 && !error && !searching && (
        <div className="state-card">
          <span className="state-card__icon"><IconCompare size={22} /></span>
          <h3>Sanity-check any game</h3>
          <p>
            Search a title, pick it from the results, and see its estimated GPU/CPU/RAM demand next to
            your own hardware.
          </p>
        </div>
      )}
    </div>
  )
}
