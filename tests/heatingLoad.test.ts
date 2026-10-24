import { describe, expect, it } from 'vitest'
import { heatingLoadModule } from '../src/core/modules/heatingLoad'
import { runAssessment } from '../src/core/registry'
import type { BuildingInput } from '../src/core/types'

/** Unterhaching (82008): design temperature -13.8 °C, so the climate factor is 33.8 / 32. */
const unterhaching = 33.8 / 32
const heatingLoad = (building: BuildingInput) => runAssessment(building).modules.find(module => module.id === 'heating_load')!
const methodB = (building: BuildingInput) => (heatingLoad(building).data as { methodBRangeKw: [number, number] }).methodBRangeKw
const messageKeys = (building: BuildingInput) => heatingLoad(building).reportItems?.map(item => item.messageKey)

describe('construction year from the Zensus prior', () => {
  // A fresh object per test: runAssessment writes the public data into its input.
  const unknownYear = (): BuildingInput => ({
    location: '82008 Unterhaching', fuelType: 'gas_kwh', annualConsumption: 10000,
    constructionOrRenovationYear: 1982, constructionYearSource: 'estimated', heatedFloorAreaM2: 195,
  })

  /** The region's most common era (1968–1998) spans the 120–180 and 80–120 W/m² bands. */
  it('uses the W/m² range of the regional era when the year is unknown', () => {
    const [min, max] = methodB(unknownYear())
    expect(min).toBeCloseTo(80 * unterhaching * 0.195)
    expect(max).toBeCloseTo(180 * unterhaching * 0.195)
    expect(heatingLoad(unknownYear()).reportItems).toContainEqual(expect.objectContaining({ messageKey: 'heating.yearEstimated', params: { era: '1968–1998' } }))
  })

  /** A year that the customer gives always wins over the regional era. */
  it('keeps the band of a known year', () => {
    const knownYear = (): BuildingInput => ({ ...unknownYear(), constructionOrRenovationYear: 2005, constructionYearSource: 'user' })
    const [min, max] = methodB(knownYear())
    expect(min).toBeCloseTo(40 * unterhaching * 0.195)
    expect(max).toBeCloseTo(60 * unterhaching * 0.195)
    expect(messageKeys(knownYear())).not.toContain('heating.yearEstimated')
  })

  /** Without a location the nationwide prior (1950–1979) stands in, at the reference climate. */
  it('uses the nationwide era when the location is skipped', () => {
    const noLocation: BuildingInput = { ...unknownYear(), location: undefined, constructionOrRenovationYear: 1972, heatedFloorAreaM2: 100 }
    expect(methodB(noLocation)).toEqual([12, 18])
    expect(heatingLoad(noLocation).reportItems).toContainEqual(expect.objectContaining({ messageKey: 'heating.yearEstimated', params: { era: '1950–1979' } }))
  })
})

describe('heatingLoadModule', () => {
  it('calculates method A and method B range', () => {
    const result = heatingLoadModule.run(
      {
        fuelType: 'gas_m3',
        annualConsumption: 2000,
        occupants: 2,
        constructionOrRenovationYear: 1990,
        heatedFloorAreaM2: 150,
      },
      {},
    )

    expect(result.status).toBe('ok')
    expect(result.data).toMatchObject({
      methodAKw: 7.8,
      methodBRangeKw: [12, 18],
      rangeKw: [7.8, 18],
    })
  })

  it('adds advisory note for high baseline category', () => {
    const result = heatingLoadModule.run(
      {
        fuelType: 'gas_kwh',
        annualConsumption: 12000,
        occupants: 3,
        constructionOrRenovationYear: 1975,
        heatedFloorAreaM2: 140,
      },
      {},
    )

    expect(result.notes?.[0]).toContain('above 75 W/m²')
  })

  it('applies DIN EN 12831 climate adjustment factor when outdoor design temp is provided', () => {
    // Munich: Te = -14.2°C -> deltaT = 34.2 K -> fClimate = 34.2 / 32 = 1.06875 (+6.9%)
    const resultMunich = heatingLoadModule.run(
      {
        fuelType: 'gas_kwh',
        annualConsumption: 12000,
        constructionOrRenovationYear: 1990,
        heatedFloorAreaM2: 100,
        designOutdoorTempC: -14.2,
      },
      {},
    )
    expect(resultMunich.data).toMatchObject({
      designOutdoorTempC: -14.2,
      climateAdjustmentFactor: 1.069,
      methodBRangeKw: [8.55, 12.825],
    })

    // Cologne: Te = -8.1°C -> deltaT = 28.1 K -> fClimate = 28.1 / 32 = 0.878125 (-12.2%)
    const resultCologne = heatingLoadModule.run(
      {
        fuelType: 'gas_kwh',
        annualConsumption: 12000,
        constructionOrRenovationYear: 1990,
        heatedFloorAreaM2: 100,
        designOutdoorTempC: -8.1,
      },
      {},
    )
    expect(resultCologne.data).toMatchObject({
      designOutdoorTempC: -8.1,
      climateAdjustmentFactor: 0.878,
      methodBRangeKw: [7.025, 10.5375],
    })
  })
})
