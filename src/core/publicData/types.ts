/**
 * Public data models and interfaces for building energy assessment.
 *
 * Defines typed contracts for the geocoded place, DIN EN 12831 climate figures,
 * electricity grid operator information, Zensus building priors, and cross-checks.
 */

export type ClimateData = {
  matchedPlz: string
  matchedCity: string
  designOutdoorTempC: number
  annualMeanTempC?: number
  source: string
}

export type GridAndDsoContext = {
  dsoName: string
  responsibleRegion: string
  section14aGuaranteed: boolean
  reducedGridFeeEligible: boolean
  regionalPvDensity?: 'low' | 'medium' | 'high'
  source: string
}

export type ZensusPriors = {
  state: string
  dominantEra: string
  /** First and last construction year of the dominant era. */
  era: [number, number]
  estimatedYear: number
  dominantFuel: 'gas' | 'oil' | 'district' | 'heat_pump' | 'pellet'
  source: string
}

export type SubsidyInfo = {
  federalBasePercent: number
  speedBonusPercent: number
  incomeBonusMaxPercent: number
  maxEligibleCostEur: number
  regionalProgramName?: string
  regionalBonusPercent?: number
  maxRegionalGrantEur?: number
  notes: string[]
}

export type CrossCheckItem = {
  field: string
  statedValue: string | number
  publicValue: string | number
  status: 'match' | 'divergence' | 'neutral'
  message: string
}

export type PublicDataResult = {
  query: string
  formattedAddress?: string
  postalCode?: string
  city?: string
  coordinates?: { lat: number; lon: number }
  climate?: ClimateData
  grid?: GridAndDsoContext
  zensus?: ZensusPriors
  subsidies?: SubsidyInfo
  crossChecks: CrossCheckItem[]
  retrievedAt: string
}
