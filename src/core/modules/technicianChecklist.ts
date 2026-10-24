import type { AssessmentModule } from '../types'
import { getBuildingAgeChecks } from '../reportChecks'
import { makeReportItem } from '../reportItems'
import { REPORT_LOCALES } from '../reportLocales'

export const technicianChecklistModule: AssessmentModule = {
  id: 'technician_checklist',
  label: 'Technician checklist',
  run(building) {
    return {
      id: 'technician_checklist',
      label: 'Technician checklist',
      status: 'ok',
      headline: REPORT_LOCALES.en.results.cards.checklist.headline,
      explanation: REPORT_LOCALES.en.results.cards.checklist.explanation,
      data: {
        items: [],
      },
      reportItems: [
        makeReportItem('heating.verify', 'verify', 'high'),
        makeReportItem('technician.roomSizing', 'verify', 'high'),
        makeReportItem('technician.electrical', 'verify', 'high'),
        makeReportItem('technician.location', 'verify', 'high'),
        ...getBuildingAgeChecks(building),
      ],
    }
  },
}
