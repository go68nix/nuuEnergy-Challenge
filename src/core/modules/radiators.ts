import type { AssessmentModule } from '../types'
import { makeReportItem } from '../reportItems'
import { REPORT_LOCALES } from '../reportLocales'

export const radiatorsModule: AssessmentModule = {
  id: 'radiators',
  label: 'Radiator assessment',
  run() {
    return {
      id: 'radiators',
      label: 'Radiator assessment',
      status: 'not_implemented',
      headline: REPORT_LOCALES.en.results.cards.flow.headline,
      explanation: REPORT_LOCALES.en.results.cards.flow.explanation,
      notes: ['Not implemented yet.'],
      reportItems: [makeReportItem('radiators.missing', 'missing')],
    }
  },
}
