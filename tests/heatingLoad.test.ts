import { describe, expect, it } from 'vitest'
import { heatingLoadModule } from '../src/core/modules/heatingLoad'

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
