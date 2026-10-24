import type { AssessmentModule } from '../types'

export const trafficLightModule: AssessmentModule = {
  id: 'traffic_light',
  label: 'Traffic light summary',
  run() {
    return {
      id: 'traffic_light',
      label: 'Traffic light summary',
      status: 'not_implemented',
      notes: ['Not implemented yet.', 'TODO: combine module results into green/yellow/red.'],
    }
  },
}
