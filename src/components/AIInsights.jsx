import { useState } from 'react'
import { getAiRecommendations } from '../lib/mistral'
import { IconRefresh, IconSparkle } from './Icons'

export function AIInsights({ specs, ranked, aiData, onAiData, showToast }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const data = await getAiRecommendations(specs, ranked.slice(0, 6)) // must match api/recommend.js's MAX_CANDIDATES
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
        <div className="ai-insights__pitch">
          <h3><IconSparkle size={18} /> AI insights for this rig</h3>
          <p>
            One Mistral call reads your exact hardware and the top picks above, then explains the
            bottleneck, the settings to run, and what an upgrade would actually buy you.
          </p>
        </div>
        <button className="btn btn--primary" disabled={loading || ranked.length === 0} onClick={handleClick}>
          {loading ? <><span className="spinner" /> Asking Mistral…</> : <><IconSparkle size={16} /> Get AI insights</>}
        </button>
      </div>
    )
  }

  return (
    <div className="ai-insights">
      <div className="ai-insights__head">
        <IconSparkle size={17} />
        <h3>AI insights</h3>
      </div>

      <p className="ai-insights__summary">{aiData.profileSummary}</p>

      {aiData.overallBottleneck && (
        <p className="ai-insights__bottleneck">
          <span className="chip chip--accent">Bottleneck: {aiData.overallBottleneck.component}</span>
          {aiData.overallBottleneck.reasoning}
        </p>
      )}

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

      <button className="btn btn--sm" disabled={loading} onClick={handleClick}>
        {loading ? <><span className="spinner" /> Refreshing…</> : <><IconRefresh size={15} /> Refresh insights</>}
      </button>
    </div>
  )
}
