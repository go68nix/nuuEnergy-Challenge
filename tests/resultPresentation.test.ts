import { describe, expect, it } from 'vitest'
import { chooseDecidingFactors, costDifferenceWording, confidenceLabel, rangePosition, verdictHeadline } from '../src/core/resultPresentation'
import type { AssessmentResult } from '../src/core/types'

const assessment = (level: 'green' | 'yellow' | 'red', pipe_system: 'two-pipe' | 'single-pipe' | 'unknown' = 'unknown'): AssessmentResult => ({
  building: { fuelType: 'gas_kwh', annualConsumption: 12000, constructionOrRenovationYear: 2010, heatedFloorAreaM2: 120, heatingDistribution: 'underfloor' },
  modules: [
    { id: 'traffic_light', label: 'Traffic', status: 'ok', data: { level } },
    { id: 'heating_load', label: 'Load', status: 'ok', data: { rangeKw: [5, 12] } },
    { id: 'pipe_type', label: 'Pipe', status: 'warning', data: { pipe_system, source: pipe_system === 'two-pipe' ? 'user' : 'unknown' } },
  ],
})

describe('result presentation helpers', () => {
  it('chooses assessment-backed deciding factors', () => {
    expect(chooseDecidingFactors(assessment('green', 'two-pipe')).map(item => item.id)).toEqual(['underfloor', 'load', 'two-pipe'])
    expect(chooseDecidingFactors(assessment('red', 'single-pipe')).some(item => item.id === 'single-pipe')).toBe(true)
  })

  it('selects the headline for each verdict', () => {
    expect(verdictHeadline('yellow', { green: 'ready', yellow: 'check first', red: 'not ready' })).toBe('check first')
  })

  it('calculates range bar positions and clamps them', () => {
    expect(rangePosition(5, 0, 10)).toBe(50)
    expect(rangePosition(20, 0, 10)).toBe(100)
  })

  it('describes savings, extra cost, and roughly equal costs', () => {
    expect(costDifferenceWording(240)).toContain('saving')
    expect(costDifferenceWording(-240)).toContain('extra cost')
    expect(costDifferenceWording(10)).toContain('Roughly equal')
  })

  it('labels estimated values distinctly', () => {
    expect(confidenceLabel('estimated')).toBe('estimate')
    expect(confidenceLabel('provided')).toBe('provided')
  })
})
