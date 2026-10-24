/**
 * Heating load estimation module complying with DIN EN 12831 baseline methodology.
 *
 * Computes consumption-derived load (Method A) and envelope-baseline load (Method B),
 * applying DIN EN 12831 design outdoor temperature climate factors when location data is available.
 */

import type { AssessmentModule, BuildingInput } from '../types'
import { lookupZensusPriors } from '../publicData/zensusPriors'
import { getGridDimmingItem, getHeatingLoadDisagreementItem } from '../reportChecks'
import { makeReportItem } from '../reportItems'
import { REPORT_LOCALES } from '../reportLocales'

const FULL_LOAD_HOURS = 2000
const HOT_WATER_KWH_PER_OCCUPANT = 1000
const REFERENCE_INDOOR_TEMP_C = 20.0
const REFERENCE_DESIGN_OUTDOOR_TEMP_C = -12.0
const REFERENCE_DELTA_T = REFERENCE_INDOOR_TEMP_C - REFERENCE_DESIGN_OUTDOOR_TEMP_C // 32 K

const getConsumptionKwh = (building: BuildingInput): number => {
  switch (building.fuelType) {
    case 'gas_m3':
      return building.annualConsumption * 10
    case 'heating_oil_l':
      return building.annualConsumption * 10
    case 'gas_kwh':
      return building.annualConsumption
  }
}

const getBaselineWPerM2Range = (year: number): [number, number] => {
  if (year <= 1979) {
    return [120, 180]
  }

  if (year >= 1980 && year <= 1999) {
    return [80, 120]
  }

  if (year >= 2020) {
    return [15, 40]
  }

  if (year >= 2002) {
    return [40, 60]
  }

  return [80, 120]
}

/**
 * Span the W/m² bands of every construction year in a building era.
 *
 * :param era: First and last construction year of the era.
 * :returns: The lowest band minimum and the highest band maximum in the era.
 */
const getEraWPerM2Range = ([firstYear, lastYear]: [number, number]): [number, number] => {
  const bands = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => getBaselineWPerM2Range(firstYear + index))
  return [Math.min(...bands.map(([min]) => min)), Math.max(...bands.map(([, max]) => max))]
}

/**
 * Compute DIN EN 12831 climate correction factor based on design outdoor temperature.
 *
 * :param designOutdoorTempC: Design outdoor temperature in °C.
 * :returns: Dimensionless scaling factor relative to national reference (32 K).
 */
export const getClimateAdjustmentFactor = (designOutdoorTempC?: number): number => {
  if (designOutdoorTempC === undefined) {
    return 1.0
  }
  const deltaT = REFERENCE_INDOOR_TEMP_C - designOutdoorTempC
  return deltaT / REFERENCE_DELTA_T
}

export const heatingLoadModule: AssessmentModule = {
  id: 'heating_load',
  label: 'Heating load estimate',
  run(building) {
    const designOutdoorTempC =
      building.designOutdoorTempC ??
      building.publicData?.climate?.designOutdoorTempC
    const fClimate = getClimateAdjustmentFactor(designOutdoorTempC)

    const consumptionKwh = getConsumptionKwh(building)
    const usableHeatKwh = Math.max(consumptionKwh * 0.88 - (building.occupants ?? 0) * HOT_WATER_KWH_PER_OCCUPANT, 0)
    const methodAKw = usableHeatKwh / FULL_LOAD_HOURS

    // A known year always wins; the regional era only stands in for an unknown one.
    const yearPrior = building.constructionYearSource === 'estimated'
      ? building.publicData?.zensus ?? lookupZensusPriors('')
      : undefined
    const [baselineMinWm2, baselineMaxWm2] = yearPrior
      ? getEraWPerM2Range(yearPrior.era)
      : getBaselineWPerM2Range(building.constructionOrRenovationYear)
    const adjustedMinWm2 = baselineMinWm2 * fClimate
    const adjustedMaxWm2 = baselineMaxWm2 * fClimate

    const methodBRangeKw: [number, number] = [
      (adjustedMinWm2 * building.heatedFloorAreaM2) / 1000,
      (adjustedMaxWm2 * building.heatedFloorAreaM2) / 1000,
    ]

    const rangeKw: [number, number] = [
      Math.min(methodAKw, methodBRangeKw[0]),
      Math.max(methodAKw, methodBRangeKw[1]),
    ]

    const notes: string[] = []
    if (baselineMaxWm2 > 75) {
      notes.push('Advice: baseline above 75 W/m², check envelope upgrades before final design.')
    }
    if (yearPrior) {
      notes.push(
        `Construction year unknown: ${baselineMinWm2}–${baselineMaxWm2} W/m² cover the most common building era ${yearPrior.dominantEra} in ${yearPrior.state} (Zensus prior).`,
      )
    }
    if (designOutdoorTempC !== undefined && fClimate !== 1.0) {
      notes.push(
        `DIN EN 12831 climate factor: ${(fClimate * 100).toFixed(1)}% applied for local design outdoor temperature of ${designOutdoorTempC}°C.`,
      )
    }
    const reportItems = [
      makeReportItem('heating.verify', 'verify', 'high'),
      ...(building.occupants === undefined ? [makeReportItem('heating.missingOccupants', 'missing')] : []),
      ...(yearPrior ? [makeReportItem('heating.yearEstimated', 'missing', 'high', { era: yearPrior.dominantEra })] : []),
      getHeatingLoadDisagreementItem(methodAKw, methodBRangeKw),
      getGridDimmingItem(rangeKw, building.publicData?.grid?.dsoName),
    ].filter((item): item is NonNullable<typeof item> => item !== undefined)

    return {
      id: 'heating_load',
      label: 'Heating load estimate',
      headline: REPORT_LOCALES.en.results.cards.heating.headline,
      explanation: REPORT_LOCALES.en.results.cards.heating.explanation,
      status: 'ok',
      data: {
        methodAKw,
        methodBRangeKw,
        rangeKw,
        fullLoadHours: FULL_LOAD_HOURS,
        designOutdoorTempC,
        climateAdjustmentFactor: Math.round(fClimate * 1000) / 1000,
      },
      notes: notes.length > 0 ? notes : undefined,
      reportItems,
    }
  },
}
