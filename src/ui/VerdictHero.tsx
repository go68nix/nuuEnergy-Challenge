import { REPORT_LOCALES } from '../core/reportLocales'
import { chooseDecidingFactors, verdictHeadline } from '../core/resultPresentation'
import type { AssessmentResult, TrafficLight } from '../core/types'
import { FactorList } from './FactorList'
import { TrafficLight as TrafficLightGraphic } from './TrafficLight'

export const VerdictHero = ({ assessment, level, reasoning }: { assessment: AssessmentResult; level: TrafficLight; reasoning: string }) => {
  const locale = REPORT_LOCALES.en.results
  return <section className={`verdict-hero verdict-${level}`} aria-labelledby="verdict-title"><TrafficLightGraphic level={level} /><div className="verdict-copy"><span className="eyebrow">PRELIMINARY VERDICT</span><h2 id="verdict-title">{verdictHeadline(level, locale.verdictHeadline)}</h2><p>{reasoning}</p><FactorList factors={chooseDecidingFactors(assessment)} title={locale.decidingFactors} /><small>{locale.preliminary}</small></div></section>
}
