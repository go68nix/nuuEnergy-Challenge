import { heatingLoadModule } from './modules/heatingLoad'
import { operatingCostModule } from './modules/operatingCost'
import { radiatorsModule } from './modules/radiators'
import { technicianChecklistModule } from './modules/technicianChecklist'
import { trafficLightModule } from './modules/trafficLight'
import { pipeTypeModule } from './modules/pipeType'
import { publicDataModule } from './modules/publicData'
import type { AssessmentContext, AssessmentModule, AssessmentResult, BuildingInput } from './types'

export const assessmentModules: AssessmentModule[] = [
  publicDataModule,
  heatingLoadModule,
  operatingCostModule,
  radiatorsModule,
  technicianChecklistModule,
  pipeTypeModule,
  trafficLightModule,
]

export const runAssessment = (
  building: BuildingInput,
  context: AssessmentContext = {},
): AssessmentResult => {
  return {
    building,
    modules: assessmentModules.map((module) => module.run(building, context)),
    context,
  }
}
