import type { AssessmentModule } from '../types'
import { makeReportItem } from '../reportItems'

export const radiatorsModule: AssessmentModule = {
  id: 'radiators',
  label: 'Radiator assessment',
  run() {
    return {
      id: 'radiators',
      label: 'Radiator assessment',
      status: 'not_implemented',
      notes: ['Not implemented yet.'],
      reportItems: [makeReportItem('radiators.missing', 'missing')],
    }
  },
}
