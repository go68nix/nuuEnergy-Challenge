import type { AssessmentModule, BuildingInput } from '../types'
import { getImplausibleEnergyUseItem } from '../reportChecks'
import { makeReportItem } from '../reportItems'
import { REPORT_LOCALES } from '../reportLocales'

const ELECTRICITY_EUR_PER_KWH = 0.26
const GAS_EUR_PER_KWH = 0.11
const OIL_EUR_PER_L = 1.7

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

const getCurrentCost = (building: BuildingInput): number => {
  switch (building.fuelType) {
    case 'gas_m3':
      return getConsumptionKwh(building) * GAS_EUR_PER_KWH
    case 'gas_kwh':
      return building.annualConsumption * GAS_EUR_PER_KWH
    case 'heating_oil_l':
      return building.annualConsumption * OIL_EUR_PER_L
  }
}

const getJaz = (inputJaz?: number, flowTemperatureClass: 'low' | 'medium' | 'high' = 'medium') => {
  if (inputJaz && inputJaz > 0) {
    return inputJaz
  }

  if (flowTemperatureClass === 'low') {
    return 4.0
  }

  if (flowTemperatureClass === 'high') {
    return 2.8
  }

  return 3.5
}

export const operatingCostModule: AssessmentModule = {
  id: 'operating_cost',
  label: 'Operating cost estimate',
  run(building, context) {
    const jaz = getJaz(context.jaz, context.flowTemperatureClass)
    const heatDemandKwh = getConsumptionKwh(building) * 0.88
    const heatPumpElectricityKwh = heatDemandKwh / jaz
    const estimatedHeatPumpCostEur = heatPumpElectricityKwh * ELECTRICITY_EUR_PER_KWH
    const currentCostEur = getCurrentCost(building)
    const annualSavingsEur = currentCostEur - estimatedHeatPumpCostEur

    return {
      id: 'operating_cost',
      label: 'Operating cost estimate',
      status: annualSavingsEur >= 0 ? 'ok' : 'warning',
      headline: REPORT_LOCALES.en.results.cards.costs.headline,
      explanation: REPORT_LOCALES.en.results.cards.costs.explanation,
      data: {
        jaz,
        currentCostEur,
        estimatedHeatPumpCostEur,
        annualSavingsEur,
      },
      reportItems: [makeReportItem('cost.assumptions', 'uncertain'), getImplausibleEnergyUseItem(building)].filter((item): item is NonNullable<typeof item> => item !== undefined),
    }
  },
}
