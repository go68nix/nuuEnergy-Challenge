export type FuelType = 'gas_m3' | 'gas_kwh' | 'heating_oil_l'

export type TrafficLight = 'green' | 'yellow' | 'red'

export type ModuleStatus = 'ok' | 'warning' | 'error' | 'not_implemented'

export type BuildingInput = {
  fuelType: FuelType
  annualConsumption: number
  occupants: number
  constructionOrRenovationYear: number
  heatedFloorAreaM2: number
}

export type ModuleResult = {
  id: string
  label: string
  status: ModuleStatus
  data?: unknown
  notes?: string[]
}

export type AssessmentResult = {
  building: BuildingInput
  modules: ModuleResult[]
}

export type AssessmentContext = {
  jaz?: number
  flowTemperatureClass?: 'low' | 'medium' | 'high'
}

export type AssessmentModule = {
  id: string
  label: string
  run: (building: BuildingInput, context: AssessmentContext) => ModuleResult
}
