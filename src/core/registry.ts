import { heatingLoadModule } from './modules/heatingLoad'
import { operatingCostModule } from './modules/operatingCost'
import { radiatorsModule } from './modules/radiators'
import { technicianChecklistModule } from './modules/technicianChecklist'
import { trafficLightModule } from './modules/trafficLight'
import type { AssessmentContext, AssessmentModule, AssessmentResult, BuildingInput } from './types'

export const assessmentModules: AssessmentModule[] = [
  heatingLoadModule,
  operatingCostModule,
  radiatorsModule,
  technicianChecklistModule,
  trafficLightModule,
]

export const runAssessment = (
  building: BuildingInput,
  context: AssessmentContext = {},
): AssessmentResult => {
  return {
    building,
    modules: assessmentModules.map((module) => module.run(building, context)),
  }
}
