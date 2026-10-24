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
})
