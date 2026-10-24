import type { AssessmentResult, ModuleResult } from '../core/types'
import { confidenceLabel } from '../core/resultPresentation'
import { CostBars } from './CostBars'
import { RangeBar } from './RangeBar'

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {}
const number = (value: unknown) => typeof value === 'number' ? value : undefined

export const ResultCard = ({ module, assessment }: { module: ModuleResult; assessment: AssessmentResult }) => {
  const data = record(module.data)
  const source = module.id === 'pipe_type' ? (data.source === 'user' ? 'provided' : data.source === 'estimated' ? 'estimated' : 'unknown') : module.status === 'not_implemented' ? 'unknown' : 'estimated'
  if (module.status === 'not_implemented') return <article className="result-card is-muted"><div className="card-title"><h3>{module.headline ?? module.label}</h3><span className="confidence-badge">not available</span></div><strong className="unavailable">{'Not available yet'}</strong><p>{module.explanation}</p></article>
  if (module.id === 'heating_load') {
    const range = Array.isArray(data.rangeKw) ? data.rangeKw as [number, number] : undefined
    return <article className="result-card"><div className="card-title"><h3>{module.headline}</h3><span className="confidence-badge estimate">estimate</span></div><strong className="card-number">{range ? `${range[0].toFixed(1)}–${range[1].toFixed(1)} kW` : '—'}</strong><RangeBar methodA={number(data.methodAKw)} methodB={Array.isArray(data.methodBRangeKw) ? data.methodBRangeKw as [number, number] : undefined} combined={range} /><p>{module.explanation}</p>{module.notes?.map(note => <small className="card-note" key={note}>{note}</small>)}</article>
  }
  if (module.id === 'operating_cost') return <article className="result-card"><div className="card-title"><h3>{module.headline}</h3><span className="confidence-badge estimate">estimate</span></div><CostBars current={number(data.currentCostEur)} heatPump={number(data.estimatedHeatPumpCostEur)} jaz={number(data.jaz)} /><p>{module.explanation}</p></article>
  if (module.id === 'pipe_type') {
    const photo = assessment.photos?.[0]
    return <article className="result-card"><div className="card-title"><h3>{module.headline}</h3><span className={`confidence-badge ${source === 'estimated' ? 'estimate' : ''}`}>{confidenceLabel(source as 'provided' | 'estimated' | 'unknown')}</span></div><strong className="card-number">{String(data.pipe_system ?? 'Unknown')}</strong><p>{module.explanation}</p><small>{String(data.basis ?? '')}</small>{photo && <img className="pipe-thumb" src={photo.highlightedUrl ?? photo.url} alt="Pipe system evidence" />}</article>
  }
  return <article className="result-card"><div className="card-title"><h3>{module.headline ?? module.label}</h3><span className="confidence-badge">{confidenceLabel(source as 'provided' | 'estimated' | 'unknown')}</span></div><strong className="card-number">{module.status === 'ok' ? 'Checked' : 'Review'}</strong><p>{module.explanation ?? module.label}</p></article>
}
