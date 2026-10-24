import { describe, expect, it } from 'vitest'
import { runAssessment } from '../src/core/registry'
import type { TrafficLightData } from '../src/core/modules/trafficLight'
import type { RadiatorAssessmentData } from '../src/core/modules/radiators'

describe('Challenge Benchmark Evaluation Buildings (B-01 to B-05)', () => {
  it('evaluates B-01 (2001, 195 m², radiators, gas 10k kWh, PLZ 82xxx) as Green', () => {
    const result = runAssessment({
      location: '82008 Unterhaching',
      fuelType: 'gas_kwh',
      annualConsumption: 10000,
      constructionOrRenovationYear: 2001,
      heatedFloorAreaM2: 195,
      heatingDistribution: 'radiator',
      heatingSystem: 'gas',
      pipe_system: 'two-pipe',
      pipeSystemSource: 'user',
      facadeInsulated: true,
      roofInsulated: true,
    })

    const trafficLightMod = result.modules.find((m) => m.id === 'traffic_light')
    const tlData = trafficLightMod?.data as TrafficLightData
    expect(tlData.verdict).toBe('green')
    expect(tlData.color).toBe('green')
    expect(result.building.publicData?.climate?.designOutdoorTempC).toBeDefined()
  })

  it('evaluates B-02 (2005, 180 m², underfloor, gas 15.5k kWh, PLZ 82xxx) as Green with JAZ 4.0', () => {
    const result = runAssessment({
      location: '82041 Oberhaching',
      fuelType: 'gas_kwh',
      annualConsumption: 15500,
      constructionOrRenovationYear: 2005,
      heatedFloorAreaM2: 180,
      heatingDistribution: 'underfloor',
      heatingSystem: 'gas',
      pipe_system: 'two-pipe',
      pipeSystemSource: 'user',
    })

    const trafficLightMod = result.modules.find((m) => m.id === 'traffic_light')
    const tlData = trafficLightMod?.data as TrafficLightData
    expect(tlData.verdict).toBe('green')

    const opCostMod = result.modules.find((m) => m.id === 'operating_cost')
    expect((opCostMod?.data as { jaz: number }).jaz).toBe(4.0)
  })

  it('evaluates B-03 (1970, 200 m², radiators, oil 40k kWh, PLZ 21xxx) as Yellow (never Red)', () => {
    const result = runAssessment({
      location: '21029 Hamburg',
      fuelType: 'heating_oil_l',
      annualConsumption: 4000,
      constructionOrRenovationYear: 1970,
      heatedFloorAreaM2: 200,
      heatingDistribution: 'radiator',
      heatingSystem: 'oil',
      pipe_system: 'two-pipe',
      facadeInsulated: false,
      roofInsulated: false,
    })

    const trafficLightMod = result.modules.find((m) => m.id === 'traffic_light')
    const tlData = trafficLightMod?.data as TrafficLightData
    expect(tlData.verdict).toBe('yellow')
    expect(tlData.verdict).not.toBe('red')
    expect(tlData.ctaText).toContain('nuuEnergy')

    const radiatorMod = result.modules.find((m) => m.id === 'radiators')
    const radData = radiatorMod?.data as RadiatorAssessmentData
    expect(radData.flowTemperatureClass).toBe('high')
  })

  it('evaluates B-04 (1987, 160 m², single-pipe, oil 25k kWh, PLZ 85xxx) as Yellow (never Red)', () => {
    const result = runAssessment({
      location: '85221 Dachau',
      fuelType: 'heating_oil_l',
      annualConsumption: 2500,
      constructionOrRenovationYear: 1987,
      heatedFloorAreaM2: 160,
      heatingDistribution: 'radiator',
      heatingSystem: 'oil',
      pipe_system: 'single-pipe',
      pipeSystemSource: 'user',
    })

    const trafficLightMod = result.modules.find((m) => m.id === 'traffic_light')
    const tlData = trafficLightMod?.data as TrafficLightData
    expect(tlData.verdict).toBe('yellow')
    expect(tlData.verdict).not.toBe('red')
    expect(tlData.reasons.some((r) => r.includes('Single-pipe'))).toBe(true)
  })

  it('evaluates B-05 (2006, 125 m², mixed, gas 27k kWh, PLZ 85xxx) smoothly with climate correction', () => {
    const result = runAssessment({
      location: '85748 Garching',
      fuelType: 'gas_kwh',
      annualConsumption: 27000,
      constructionOrRenovationYear: 2006,
      heatedFloorAreaM2: 125,
      heatingDistribution: 'mixed',
      heatingSystem: 'gas',
      pipe_system: 'two-pipe',
    })

    const trafficLightMod = result.modules.find((m) => m.id === 'traffic_light')
    const tlData = trafficLightMod?.data as TrafficLightData
    expect(['green', 'yellow']).toContain(tlData.verdict)
    expect(tlData.verdict).not.toBe('red')

    const heatLoadMod = result.modules.find((m) => m.id === 'heating_load')
    expect((heatLoadMod?.data as { climateAdjustmentFactor: number }).climateAdjustmentFactor).toBeGreaterThan(0)
  })
})
