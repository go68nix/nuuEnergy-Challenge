import type { AssessmentResult } from '../core/types'
import { answerLabel } from './BuildingForm'
import { REPORT_LOCALES } from '../core/reportLocales'
import { buildReport } from '../core/report'

type ResultPanelProps = {
  result: AssessmentResult | null
  onOpenReport: () => void
}

const HeatingLoadDiagram = ({ result }: { result: AssessmentResult }) => {
  const data = result.modules.find(module => module.id === 'heating_load')?.data
  if (!data || typeof data !== 'object') return null
  const load = data as { methodAKw?: number; methodBRangeKw?: [number, number]; rangeKw?: [number, number] }
  const methodA = typeof load.methodAKw === 'number' ? load.methodAKw : undefined
  const methodB = Array.isArray(load.methodBRangeKw) ? load.methodBRangeKw : undefined
  if (methodA === undefined && !methodB) return null
  const max = Math.max(methodA ?? 0, ...(methodB ?? [0]), 1)
  const width = (value: number) => `${Math.max(2, Math.min(100, value / max * 100))}%`
  return <div className="load-diagram" aria-label="Heating load estimate comparison">
    <div className="load-scale"><span>0 kW</span><span>{max.toFixed(1)} kW</span></div>
    {methodA !== undefined && <div className="load-row"><span>Consumption method</span><div className="load-track"><i style={{ width: width(methodA) }}/></div><strong>{methodA.toFixed(1)} kW</strong></div>}
    {methodB && <div className="load-row"><span>Building method</span><div className="load-track"><i className="load-range" style={{ left: `${methodB[0] / max * 100}%`, width: `${Math.max(2, (methodB[1] - methodB[0]) / max * 100)}%` }}/></div><strong>{methodB[0].toFixed(1)}–{methodB[1].toFixed(1)} kW</strong></div>}
    {load.rangeKw && <p>Combined planning range: <strong>{load.rangeKw[0].toFixed(1)}–{load.rangeKw[1].toFixed(1)} kW</strong></p>}
  </div>
}

export const ResultPanel = ({ result, onOpenReport }: ResultPanelProps) => {
  if (!result) return null
  const report = buildReport(result.building, result, 'en')
  const fuelLabel = result.building.fuelType === 'gas_m3' ? 'Natural gas (m³)' : result.building.fuelType === 'gas_kwh' ? 'Natural gas (kWh)' : 'Heating oil (L)'
  const consumptionUnit = result.building.fuelType === 'gas_m3' ? 'm³ / year' : result.building.fuelType === 'gas_kwh' ? 'kWh / year' : 'L / year'
  const findings = report.findings.filter(finding => finding.lines.some(line => !line.endsWith('Not available')))
  return (
    <section className="card results-card">
      <div className="result-section"><span className="eyebrow">YOUR HOME REPORT</span><h2>Details you shared</h2><div className="report-grid">
        <div className="report-item"><small>Room heating</small><strong>{answerLabel(result.building.heatingDistribution) ?? '—'}</strong></div>
        <div className="report-item"><small>Building type</small><strong>{answerLabel(result.building.buildingType) ?? '—'}</strong></div>
        <div className="report-item"><small>Current heating</small><strong>{answerLabel(result.building.heatingSystem) ?? fuelLabel}</strong></div>
        <div className="report-item"><small>Annual consumption</small><strong>{result.building.annualConsumption.toLocaleString()} {consumptionUnit}</strong></div>
        <div className="report-item"><small>Original construction year</small><strong>{result.building.constructionOrRenovationYear}</strong></div>
        <div className="report-item"><small>Facade insulated</small><strong>{answerLabel(result.building.facadeInsulated) ?? 'Unknown'}</strong></div>
        <div className="report-item"><small>Roof insulated</small><strong>{answerLabel(result.building.roofInsulated) ?? 'Unknown'}</strong></div>
        <div className="report-item"><small>Heated living space</small><strong>{result.building.heatedFloorAreaM2.toLocaleString()} m²</strong></div>
        <div className="report-item"><small>Heating system age</small><strong>{answerLabel(result.building.heatingSystemAge) ?? '—'}</strong></div>
        <div className="report-item"><small>Replacement timing</small><strong>{answerLabel(result.building.replacementTiming) ?? '—'}</strong></div>
        <div className="report-item"><small>Area heated in winter</small><strong>{answerLabel(result.building.winterHeatedShare) ?? 'Not provided'}</strong></div>
      </div></div>
      <div className="result-section"><span className="eyebrow">SUITABILITY CHECK</span><h2>Assessment results</h2>
        <article className={`suitability-summary traffic-${report.summary.level}`}><span className="traffic-dot"/><div><strong>{report.summary.label}</strong><ul>{report.summary.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><small>{report.summary.preliminaryNote}</small></div></article>
        {findings.length > 0 && <div className="results">
          {findings.map(finding => <article className="module-result" key={finding.id}><h3>{finding.title}</h3><ul>{finding.lines.map(line => <li key={line}>{line}</li>)}</ul>{finding.id === 'heating' && <HeatingLoadDiagram result={result}/>}</article>)}
        </div>}
        {result.photos && result.photos.length > 0 && <section className="photo-report"><h3>Heater photos</h3><div className="photo-list">{result.photos.map(photo=><article className="photo-check" key={photo.id}><img className={photo.highlightedUrl?'photo-highlighted':''} src={photo.kind==='not-heater'?photo.url:photo.highlightedUrl??photo.url} alt="Uploaded heater connection"/><div className="photo-detection"><strong>{photo.label}</strong><span>{Math.round(photo.confidence*100)}% confidence</span>{photo.evidence.map(item=><small key={item}>{item}</small>)}</div></article>)}</div></section>}
      </div>
      <div className="report-open-row"><button className="button-primary" onClick={onOpenReport}>{REPORT_LOCALES.de.viewReport} <span>→</span></button></div>
    </section>
  )
}
