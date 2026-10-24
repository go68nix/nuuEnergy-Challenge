import { getEnergyIntensity, REPORT_CHECK_CONFIG } from '../reportChecks'
import type { AssessmentModule } from '../types'
import { REPORT_LOCALES } from '../reportLocales'

export type PreliminaryTrafficLight = { level: 'green' | 'yellow' | 'red'; reasonKeys: string[] }

export const assessTrafficLight = (building: Parameters<AssessmentModule['run']>[0]): PreliminaryTrafficLight => {
  const intensity = getEnergyIntensity(building)
  if (building.pipeSystemSource === 'user' && building.pipe_system === 'single-pipe') {
    return { level: 'red', reasonKeys: ['summary.singlePipe'] }
  }
  if (intensity > REPORT_CHECK_CONFIG.plausibleEnergyUseKwhPerM2[1]) {
    return { level: 'red', reasonKeys: ['summary.energy'] }
  }
  if (intensity < REPORT_CHECK_CONFIG.plausibleEnergyUseKwhPerM2[0]) {
    return { level: 'yellow', reasonKeys: ['summary.energy'] }
  }
  if (building.pipeSystemSource !== 'user' || building.pipe_system === 'unknown') {
    return { level: 'yellow', reasonKeys: ['summary.estimatedPipe'] }
  }
  return { level: 'green', reasonKeys: ['summary.complete'] }
}

export const trafficLightModule: AssessmentModule = {
  id: 'traffic_light',
  label: 'Traffic light summary',
  run(building) {
    return {
      id: 'traffic_light',
      label: 'Traffic light summary',
      status: 'ok',
      headline: REPORT_LOCALES.en.results.verdictHeadline.green,
      explanation: REPORT_LOCALES.en.results.verdictReason,
      data: assessTrafficLight(building),
    }
  },
}
