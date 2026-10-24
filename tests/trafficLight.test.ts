import { describe, expect, it } from 'vitest'
import { evaluateTrafficLight, trafficLightModule } from '../src/core/modules/trafficLight'
import type { BuildingInput } from '../src/core/types'

describe('Traffic Light Business Decision Logic', () => {
  it('returns Green for modern building with underfloor heating', () => {
    const result = evaluateTrafficLight({
      fuelType: 'gas_kwh',
      annualConsumption: 12000,
      constructionOrRenovationYear: 2008,
      heatedFloorAreaM2: 140,
      heatingDistribution: 'underfloor',
      pipe_system: 'two-pipe',
      pipeSystemSource: 'user',
    })

    expect(result.verdict).toBe('green')
    expect(result.color).toBe('green')
    expect(result.badge).toContain('Directly Suitable')
    expect(result.ctaText).toContain('nuuEnergy')
  })

  it('returns Yellow (never Red) for pre-1980 uninsulated house with single-pipe heating', () => {
    const result = evaluateTrafficLight({
      fuelType: 'heating_oil_l',
      annualConsumption: 3500,
      constructionOrRenovationYear: 1968,
      heatedFloorAreaM2: 160,
      heatingDistribution: 'radiator',
      pipe_system: 'single-pipe',
      pipeSystemSource: 'user',
      facadeInsulated: false,
      roofInsulated: false,
    })

    // Company Business Rule: MUST NEVER BE RED!
    expect(result.verdict).toBe('yellow')
    expect(result.verdict).not.toBe('red')
    expect(result.color).toBe('yellow')
    expect(result.badge).toContain('Individual Planning')
    expect(result.reasons.some((r) => r.includes('Single-pipe'))).toBe(true)
    expect(result.ctaText).toContain('nuuEnergy')
  })

  it('returns Yellow for unknown pipe type in an older home, proposing on-site confirmation', () => {
    const result = evaluateTrafficLight({
      fuelType: 'gas_kwh',
      annualConsumption: 22000,
      constructionOrRenovationYear: 1978,
      heatedFloorAreaM2: 130,
      heatingDistribution: 'radiator',
      pipe_system: 'unknown',
    })

    expect(result.verdict).toBe('yellow')
    expect(result.onSiteChecklist.length).toBeGreaterThan(0)
  })

  it('executes as module returning status ok with action advice', () => {
    const mod = trafficLightModule.run({
      fuelType: 'gas_kwh',
      annualConsumption: 14000,
      constructionOrRenovationYear: 2002,
      heatedFloorAreaM2: 120,
      heatingDistribution: 'mixed',
      pipe_system: 'two-pipe',
    })

    expect(mod.status).toBe('ok')
    expect(mod.data).toHaveProperty('verdict')
    expect(mod.notes?.some((n) => n.includes('nuuEnergy') || n.includes('Next step'))).toBe(true)
  })

  it('is Yellow when either the customer rule or the report screening asks for a check, never Red', () => {
    const level = (building: BuildingInput) => (trafficLightModule.run(building, {}).data as { level: string }).level
    const modern: BuildingInput = {
      fuelType: 'gas_kwh',
      annualConsumption: 12000,
      constructionOrRenovationYear: 2008,
      heatedFloorAreaM2: 140,
      heatingDistribution: 'underfloor',
      pipe_system: 'two-pipe',
      pipeSystemSource: 'user',
    }

    expect(level(modern)).toBe('green')
    // Only the report screening flags an unknown pipe system in a house built after 1990.
    expect(level({ ...modern, pipe_system: 'unknown', pipeSystemSource: 'unknown' })).toBe('yellow')
    // The report screening rated a confirmed single-pipe system Red before.
    expect(level({ ...modern, pipe_system: 'single-pipe' })).toBe('yellow')
  })
})
