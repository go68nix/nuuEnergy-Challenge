import type { AssessmentResult, ModuleResult } from '../core/types'
import { answerLabel } from './BuildingForm'

type ResultPanelProps = {
  result: AssessmentResult | null
}

const renderData = (data: unknown): string => {
  if (data === undefined) {
    return ''
  }

  return JSON.stringify(data, null, 2)
}

const moduleStatusLabel = (moduleResult: ModuleResult) => {
  if (moduleResult.status === 'not_implemented') {
    return 'Not implemented yet'
  }

  return moduleResult.status
}

export const ResultPanel = ({ result }: ResultPanelProps) => {
  if (!result) return null
  const fuelLabel = result.building.fuelType === 'gas_m3' ? 'Natural gas (m³)' : result.building.fuelType === 'gas_kwh' ? 'Natural gas (kWh)' : 'Heating oil (L)'
  const consumptionUnit = result.building.fuelType === 'gas_m3' ? 'm³ / year' : result.building.fuelType === 'gas_kwh' ? 'kWh / year' : 'L / year'
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
        {result.building.occupants !== undefined && <div className="report-item"><small>People in home</small><strong>{result.building.occupants}</strong></div>}
      </div></div>
      <div className="result-section"><span className="eyebrow">SUITABILITY CHECK</span><h2>Assessment results</h2>
        <div className="results">
          {result.modules.map((moduleResult) => (
            <article className="module-result" key={moduleResult.id}>
              <h3>{moduleResult.label}</h3>
              <p>
                <strong>Status:</strong> {moduleStatusLabel(moduleResult)}
              </p>
              {moduleResult.notes && moduleResult.notes.length > 0 && (
                <ul>
                  {moduleResult.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
              {moduleResult.data !== undefined && <pre>{renderData(moduleResult.data)}</pre>}
              {moduleResult.id === 'technician_checklist' && result.photos && result.photos.length > 0 && <section className="photo-report"><h3>Heater photos</h3><div className="photo-list">{result.photos.map(photo=><article className="photo-check" key={photo.id}><img className={photo.highlightedUrl?'photo-highlighted':''} src={photo.kind==='not-heater'?photo.url:photo.highlightedUrl??photo.url} alt="Uploaded heater connection"/><div className="photo-detection"><strong>{photo.label}</strong><span>{Math.round(photo.confidence*100)}% confidence</span>{photo.evidence.map(item=><small key={item}>{item}</small>)}</div></article>)}</div></section>}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
