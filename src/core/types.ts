export type FuelType = 'gas_m3' | 'gas_kwh' | 'heating_oil_l'

export type TrafficLight = 'green' | 'yellow' | 'red'

export type ModuleStatus = 'ok' | 'warning' | 'error' | 'not_implemented'

export type BuildingInput = {
  fuelType: FuelType
  annualConsumption: number
  occupants?: number
  constructionOrRenovationYear: number
  heatedFloorAreaM2: number
  heatingDistribution?: 'radiator' | 'underfloor' | 'mixed'
  buildingType?: 'single_two_family' | 'apartment' | 'end_terrace' | 'mid_terrace' | 'semi_detached'
  heatingSystem?: 'gas' | 'oil' | 'pellet' | 'gas_condensing' | 'oil_condensing' | 'district_other'
  facadeInsulated?: boolean
  roofInsulated?: boolean
  heatingSystemAge?: '0_9' | '10_19' | '20_29' | '30_plus' | 'unknown'
  replacementTiming?: 'immediately' | '1_3_months' | '3_6_months' | 'over_6_months' | 'not_planned'
  winterHeatedShare?: 'half' | 'third' | 'quarter' | 'other'
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
