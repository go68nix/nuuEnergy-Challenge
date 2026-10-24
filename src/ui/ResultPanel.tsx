import { REPORT_LOCALES } from '../core/reportLocales'
import { buildReport } from '../core/report'
import type { AssessmentResult, TrafficLight } from '../core/types'
import { ResultCard } from './ResultCard'
import { VerdictHero } from './VerdictHero'
import { FactorList } from './FactorList'

type ResultPanelProps = { result: AssessmentResult | null; onOpenReport: () => void; onStartOver: () => void }

export const ResultPanel = ({ result, onOpenReport, onStartOver }: ResultPanelProps) => {
  if (!result) return null
  const report = buildReport(result.building, result, 'en')
  const trafficModule = result.modules.find(module => module.id === 'traffic_light')
  const level = ((trafficModule?.data as { level?: TrafficLight } | undefined)?.level ?? report.summary.level) as TrafficLight
  const reasoning = report.summary.reasons[0] ?? REPORT_LOCALES.en.results.verdictReason
  const factors = result.modules.flatMap(module => module.reportItems ?? []).filter(item => item.kind !== 'verify')
  const reportChecks = report.missingInformation.length + report.onSiteChecklist.length
  return <section className="results-page"><VerdictHero assessment={result} level={level} reasoning={reasoning} /><section className="why-section"><h2>{REPORT_LOCALES.en.results.whyVerdict}</h2><FactorList factors={factors.slice(0, 5).map((item, index) => ({ id: `${item.text}-${index}`, label: item.text, tone: item.kind === 'missing' ? 'hurting' : 'neutral', icon: item.kind === 'missing' ? 'warning' : 'dot' }))} /></section><section className="result-grid">{result.modules.filter(module => ['heating_load', 'radiators', 'pipe_type', 'operating_cost'].includes(module.id)).map(module => <ResultCard key={module.id} module={module} assessment={result} />)}{result.modules.some(module => module.notes?.some(note => note.startsWith('Advice:'))) && <ResultCard module={{ id: 'insulation', label: 'Insulation advice', status: 'warning', headline: REPORT_LOCALES.en.results.cards.checklist.headline, explanation: REPORT_LOCALES.en.results.cards.checklist.explanation }} assessment={result} />}</section><footer className="results-footer"><div><button className="button-primary" onClick={onOpenReport}>{REPORT_LOCALES.en.results.technicianReport} <span>→</span></button><button className="button-secondary" onClick={onStartOver}>{REPORT_LOCALES.en.results.startOver}</button></div><small>{reportChecks} {REPORT_LOCALES.en.results.missingSummary}</small></footer></section>
}
