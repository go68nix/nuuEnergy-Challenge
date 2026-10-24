import { describe, expect, it } from 'vitest'
import { assessRadiators, radiatorsModule } from '../src/core/modules/radiators'

describe('Radiator Assessment and Flow Temperature Law', () => {
  it('evaluates underfloor heating as low flow temperature class', () => {
    const result = assessRadiators({
      fuelType: 'gas_kwh',
      annualConsumption: 12000,
      constructionOrRenovationYear: 2012,
      heatedFloorAreaM2: 150,
      heatingDistribution: 'underfloor',
    })

    expect(result.estimatedFlowTempC).toBe(35)
    expect(result.flowTemperatureClass).toBe('low')
    expect(result.suitability).toBe('optimal')
  })

  it('evaluates insulated radiator home as directly compatible', () => {
    const result = assessRadiators({
      fuelType: 'gas_kwh',
      annualConsumption: 16000,
      constructionOrRenovationYear: 1985,
      heatedFloorAreaM2: 140,
      heatingDistribution: 'radiator',
      facadeInsulated: true,
      roofInsulated: true,
    })

    expect(result.estimatedFlowTempC).toBeLessThanOrEqual(55)
    expect(result.flowTemperatureClass).toBe('medium')
    expect(result.suitability).toBe('directly_compatible')
  })

  it('recommends radiator upgrade for older uninsulated home', () => {
    const result = assessRadiators({
      fuelType: 'gas_m3',
      annualConsumption: 3000,
      constructionOrRenovationYear: 1965,
      heatedFloorAreaM2: 170,
      heatingDistribution: 'radiator',
      facadeInsulated: false,
      roofInsulated: false,
    })

    expect(result.estimatedFlowTempC).toBeGreaterThan(55)
    expect(result.flowTemperatureClass).toBe('high')
    expect(result.suitability).toBe('upgrade_recommended')
    expect(result.recommendedUpgrades.some((u) => u.includes('Type 22') || u.includes('Type 33'))).toBe(true)
  })

  it('runs radiatorsModule properly', () => {
    const mod = radiatorsModule.run({
      fuelType: 'gas_kwh',
      annualConsumption: 10000,
      constructionOrRenovationYear: 2015,
      heatedFloorAreaM2: 110,
      heatingDistribution: 'underfloor',
    })

    expect(mod.status).toBe('ok')
    expect(mod.data).toHaveProperty('estimatedFlowTempC')
  })
})
