import { useState } from 'react'
import { getAiRecommendations } from '../lib/mistral'

export function AIInsights({ specs, ranked, aiData, onAiData, showToast }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const data = await getAiRecommendations(specs, ranked.slice(0, 15))
      onAiData(data)
    } catch (err) {
      showToast?.(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!aiData) {
    return (
      <div className="ai-insights ai-insights--empty">
        <button className="btn btn--primary" disabled={loading || ranked.length === 0} onClick={handleClick}>
          {loading ? 'Asking Mistral…' : 'Get AI insights for this PC'}
        </button>
      </div>
    )
  }

  return (
    <div className="ai-insights">
      <p className="ai-insights__summary">{aiData.profileSummary}</p>
      {aiData.upgradeSuggestions?.length > 0 && (
        <div className="ai-insights__upgrades">
          {aiData.upgradeSuggestions.map((u) => (
            <div key={u.budget} className="ai-insights__upgrade">
              <span className="ai-insights__budget">{u.budget}</span>
              <span>{u.suggestion}</span>
            </div>
          ))}
        </div>
      )}
      <button className="btn" disabled={loading} onClick={handleClick}>
        {loading ? 'Refreshing…' : 'Refresh AI insights'}
      </button>
    </div>
  )
}
