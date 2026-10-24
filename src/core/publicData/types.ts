/**
 * Public data models and interfaces for building energy assessment.
 *
 * Defines typed contracts for address resolution, DIN EN 12831 climate figures,
 * electricity grid operator information, Zensus building priors, and cross-checks.
 */

export type QueryType = 'address' | 'plz' | 'unknown'

export type SiftCandidateScore = {
  candidateId: string
  label: string
  addressSimilarity: number
  plzMatch: boolean
  houseNumberMatch: boolean
  footprintPlausible: boolean
  score: number
}

export type SiftTournamentResult = {
  candidatesConsidered: number
  topCandidates: SiftCandidateScore[]
  winnerLabel: string
  winProbability: number
}

export type AbMctsBranchResult = {
  branchName: string
  depth: number
  visits: number
  qValue: number
  ucbScore: number
  selected: boolean
}

export type BuildingGeometry = {
  coordinates?: { lat: number; lon: number }
  footprintM2?: number
  estimatedStories?: number
  estimatedGrossFloorAreaM2?: number
  buildingTypeEstimate?: 'single_two_family' | 'apartment' | 'end_terrace' | 'mid_terrace' | 'semi_detached'
  sharedWallsCount?: number
  freeParcelAreaM2?: number
  source: string
}

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
  queryType: QueryType
  formattedAddress?: string
  postalCode?: string
  city?: string
  coordinates?: { lat: number; lon: number }
  geometry?: BuildingGeometry
  climate?: ClimateData
  grid?: GridAndDsoContext
  zensus?: ZensusPriors
  subsidies?: SubsidyInfo
  crossChecks: CrossCheckItem[]
  siftTournament?: SiftTournamentResult
  abMctsBranches?: AbMctsBranchResult[]
  retrievedAt: string
}
