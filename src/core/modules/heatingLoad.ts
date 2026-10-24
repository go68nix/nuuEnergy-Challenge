import type { AssessmentModule, BuildingInput } from '../types'

const FULL_LOAD_HOURS = 2000
const HOT_WATER_KWH_PER_OCCUPANT = 1000

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

export const heatingLoadModule: AssessmentModule = {
  id: 'heating_load',
  label: 'Heating load estimate',
  run(building) {
    const consumptionKwh = getConsumptionKwh(building)
    const usableHeatKwh = Math.max(consumptionKwh * 0.88 - (building.occupants ?? 0) * HOT_WATER_KWH_PER_OCCUPANT, 0)
    const methodAKw = usableHeatKwh / FULL_LOAD_HOURS

    const [baselineMinWm2, baselineMaxWm2] = getBaselineWPerM2Range(
      building.constructionOrRenovationYear,
    )
    const methodBRangeKw: [number, number] = [
      (baselineMinWm2 * building.heatedFloorAreaM2) / 1000,
      (baselineMaxWm2 * building.heatedFloorAreaM2) / 1000,
    ]

    const rangeKw: [number, number] = [
      Math.min(methodAKw, methodBRangeKw[0]),
      Math.max(methodAKw, methodBRangeKw[1]),
    ]

    const notes =
      baselineMaxWm2 > 75
        ? ['Advice: baseline above 75 W/m², check envelope upgrades before final design.']
        : undefined

    return {
      id: 'heating_load',
      label: 'Heating load estimate',
      status: 'ok',
      data: {
        methodAKw,
        methodBRangeKw,
        rangeKw,
        fullLoadHours: FULL_LOAD_HOURS,
      },
      notes,
    }
  },
}
