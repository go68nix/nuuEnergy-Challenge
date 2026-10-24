import { estimatePipeSystemFromBuildingYear } from './questionnaireState'
import { makeReportItem } from './reportItems'
import type { AssessmentResult, BuildingInput, HeaterPhoto, ReportItem } from './types'

export const REPORT_CHECK_CONFIG = {
  heatingLoadMethodDisagreementPercent: 30,
  oldBuildingYears: 30,
  plausibleEnergyUseKwhPerM2: [20, 500] as const,
  gasM3ToKwh: 10,
  oilLitresToKwh: 10,
}

export const getHeatingLoadDisagreementPercent = (methodAKw: number, methodBRangeKw: [number, number]) => {
  const methodBMidpoint = (methodBRangeKw[0] + methodBRangeKw[1]) / 2
  if (methodBMidpoint <= 0) return methodAKw > 0 ? Number.POSITIVE_INFINITY : 0
  return (Math.abs(methodAKw - methodBMidpoint) / methodBMidpoint) * 100
}

export const getHeatingLoadDisagreementItem = (
  methodAKw: number,
  methodBRangeKw: [number, number],
  threshold = REPORT_CHECK_CONFIG.heatingLoadMethodDisagreementPercent,
): ReportItem | undefined => {
  const percent = getHeatingLoadDisagreementPercent(methodAKw, methodBRangeKw)
  return percent > threshold
    ? makeReportItem('heating.disagreement', 'uncertain', 'normal', { percent: Math.ceil(percent) })
    : undefined
}

export const getPipeYearMismatchItem = (building: BuildingInput): ReportItem | undefined => {
  if (building.pipeSystemSource !== 'estimated' || !building.pipe_system || building.pipe_system === 'unknown') return undefined
  const yearEstimate = estimatePipeSystemFromBuildingYear(building.constructionOrRenovationYear).pipe_system
  return yearEstimate !== 'unknown' && yearEstimate !== building.pipe_system
    ? makeReportItem('pipe.yearMismatch', 'uncertain')
    : undefined
}

export const getOldBuildingUnknownSystemAgeItem = (
  building: BuildingInput,
  currentYear: number,
  thresholdYears = REPORT_CHECK_CONFIG.oldBuildingYears,
): ReportItem | undefined => {
  const systemAgeUnknown = !building.heatingSystemAge || building.heatingSystemAge === 'unknown'
  return systemAgeUnknown && currentYear - building.constructionOrRenovationYear >= thresholdYears
    ? makeReportItem('system.oldBuilding', 'uncertain', 'normal', { years: thresholdYears })
    : undefined
}

export const getUnclearPhotoItem = (photos?: HeaterPhoto[]): ReportItem | undefined =>
  photos?.some(photo => photo.kind === 'pipe-unclear') ? makeReportItem('pipe.photoUnclear', 'uncertain') : undefined

export const getAnnualConsumptionKwh = (building: BuildingInput) => {
  switch (building.fuelType) {
    case 'gas_m3': return building.annualConsumption * REPORT_CHECK_CONFIG.gasM3ToKwh
    case 'heating_oil_l': return building.annualConsumption * REPORT_CHECK_CONFIG.oilLitresToKwh
    case 'gas_kwh': return building.annualConsumption
  }
}

export const getEnergyIntensity = (building: BuildingInput) => getAnnualConsumptionKwh(building) / building.heatedFloorAreaM2

export const getImplausibleEnergyUseItem = (building: BuildingInput): ReportItem | undefined => {
  const [min, max] = REPORT_CHECK_CONFIG.plausibleEnergyUseKwhPerM2
  const intensity = getEnergyIntensity(building)
  return intensity < min || intensity > max
    ? makeReportItem('energy.implausible', 'uncertain', 'high', { min, max })
    : undefined
}

export const getBuildingAgeChecks = (building: BuildingInput, currentYear = new Date().getFullYear()) => {
  const items: ReportItem[] = []
  if (!building.heatingSystemAge || building.heatingSystemAge === 'unknown') {
    items.push(makeReportItem('system.ageMissing', 'missing'))
  }
  const replacementReview = getOldBuildingUnknownSystemAgeItem(building, currentYear)
  if (replacementReview) items.push(replacementReview)
  return items
}

export const getAssessmentLoadDisagreement = (assessment: AssessmentResult) => {
  const data = assessment.modules.find(module => module.id === 'heating_load')?.data as
    | { methodAKw?: number; methodBRangeKw?: [number, number] }
    | undefined
  return data?.methodAKw !== undefined && data.methodBRangeKw
    ? getHeatingLoadDisagreementItem(data.methodAKw, data.methodBRangeKw)
    : undefined
}
