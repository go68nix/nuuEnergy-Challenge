export type FuelType = 'gas_m3' | 'gas_kwh' | 'heating_oil_l'

export type TrafficLight = 'green' | 'yellow' | 'red'

export type ModuleStatus = 'ok' | 'warning' | 'error' | 'not_implemented'
export type ReportItemKind = 'missing' | 'verify' | 'uncertain'
export type ReportPriority = 'high' | 'normal'
export type ReportMessageKey = keyof typeof import('./reportLocales').REPORT_LOCALES.en.messages
export type ReportItem = {
  kind: ReportItemKind
  text: string
  reason: string
  priority: ReportPriority
  messageKey?: ReportMessageKey
  params?: Record<string, string | number>
}

export type BuildingInput = {
  fuelType: FuelType
  annualConsumption: number
  occupants?: number
  constructionOrRenovationYear: number
  heatedFloorAreaM2: number
  heatingDistribution?: 'radiator' | 'underfloor' | 'mixed'
  buildingType?: 'single_two_family' | 'apartment' | 'end_terrace' | 'mid_terrace' | 'semi_detached'
  heatingSystem?: 'gas' | 'oil' | 'pellet' | 'gas_condensing' | 'oil_condensing' | 'district_other'
  facadeInsulated?: boolean | 'unknown'
  roofInsulated?: boolean | 'unknown'
  heatingSystemAge?: '0_9' | '10_19' | '20_29' | '30_plus' | 'unknown'
  replacementTiming?: 'immediately' | '1_3_months' | '3_6_months' | 'over_6_months' | 'not_planned'
  winterHeatedShare?: 'half' | 'third' | 'quarter' | 'other'
  pipe_system?: 'two-pipe' | 'single-pipe' | 'unknown'
  pipeSystemSource?: 'user' | 'estimated' | 'unknown'
  pipeSystemEvidence?: string[]
  pipeSystemConfidence?: number
}

export type HeaterPhoto = {
  id: string
  name: string
  url: string
  highlightedUrl?: string
  kind: 'pipe-unclear' | 'two-pipe' | 'single-pipe' | 'not-heater'
  label: string
  confidence: number
  evidence: string[]
  highlightStatus: 'loading' | 'ready' | 'failed'
  highlightMessage?: string
}

export type ModuleResult = {
  id: string
  label: string
  status: ModuleStatus
  headline?: string
  explanation?: string
  data?: unknown
  notes?: string[]
  reportItems?: ReportItem[]
}

export type AssessmentResult = {
  building: BuildingInput
  modules: ModuleResult[]
  photos?: HeaterPhoto[]
  context?: AssessmentContext
}

export type AssessmentContext = {
  jaz?: number
  flowTemperatureClass?: 'low' | 'medium' | 'high'
  photos?: HeaterPhoto[]
}

export type AssessmentModule = {
  id: string
  label: string
  run: (building: BuildingInput, context: AssessmentContext) => ModuleResult
}
