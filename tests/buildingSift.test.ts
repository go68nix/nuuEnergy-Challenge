import { describe, expect, it } from 'vitest'
import { normaliseRing, type Point } from '../src/core/buildingModel/geometry'
import { bradleyTerry, type Candidate, type MatchEvidence, rankCandidates } from '../src/core/buildingModel/sift'

const square = (x: number, y: number, size: number): Point[] =>
  normaliseRing([{ x, y }, { x: x + size, y }, { x: x + size, y: y + size }, { x, y: y + size }])

const candidate = (id: string, ring: Point[], touchingNeighbours = 0): Candidate => ({ id, ring, touchingNeighbours, tags: {} })

const addressNodeAt = (point: Point, extra: Partial<MatchEvidence> = {}): MatchEvidence => ({
  reference: point,
  nominatim: [{ point, matchedBuilding: false, houseNumber: '6', osmUrl: 'https://www.openstreetmap.org/node/1' }],
  overpassLoaded: false,
  houseNumber: '6',
  ...extra,
})

describe('Bradley-Terry fit', () => {
  it('orders candidates by their wins and keeps the strengths summing to the candidate count', () => {
    const { strengths } = bradleyTerry([[0, 3, 3], [0, 0, 2], [0, 0, 0]])
    expect(strengths[0]).toBeGreaterThan(strengths[1])
    expect(strengths[1]).toBeGreaterThan(strengths[2])
    expect(strengths.reduce((sum, s) => sum + s, 0)).toBeCloseTo(3)
  })
})

describe('SIFT ranking of building outlines', () => {
  const house = candidate('house', square(0, 0, 10))
  const neighbour = candidate('neighbour', square(14, 0, 10))

  it('ranks the outline with the address node on its wall first, within map accuracy', () => {
    const ranking = rankCandidates([neighbour, house], addressNodeAt({ x: 10.4, y: 5 }))
    expect(ranking.ranked[0].candidate.id).toBe('house')
    expect(ranking.votes.map(vote => vote.judge).sort()).toEqual(['distance', 'nominatim'])
    expect(ranking.confidence).toBeCloseTo(0.75)
  })

  it('does not count Photon again when it returns the same OSM object as Nominatim', () => {
    const evidence = addressNodeAt({ x: 10, y: 5 })
    const ranking = rankCandidates([house, neighbour], { ...evidence, photon: evidence.nominatim })
    expect(ranking.votes.some(vote => vote.judge === 'photon')).toBe(false)
    expect(ranking.confidence).toBeCloseTo(0.75)
  })

  it('counts Photon when it finds the building that Nominatim did not', () => {
    const photon = [{ point: { x: 5, y: 5 }, matchedBuilding: true, houseNumber: '6', osmUrl: 'https://www.openstreetmap.org/way/9' }]
    const ranking = rankCandidates([house, neighbour], { ...addressNodeAt({ x: 10, y: 5 }), photon })
    expect(ranking.confidence).toBeCloseTo(0.8)
  })

  it('lets the building type decide between terrace houses that the address node cannot separate', () => {
    const row = [candidate('end', square(0, 0, 10), 1), candidate('middle', square(10, 0, 10), 2), candidate('other end', square(20, 0, 10), 1)]
    const between = { x: 10, y: 0 }
    expect(rankCandidates(row, addressNodeAt(between, { buildingType: 'mid_terrace' })).ranked[0].candidate.id).toBe('middle')
    expect(rankCandidates(row, addressNodeAt(between, { buildingType: 'end_terrace' })).ranked[0].candidate.id).toBe('end')
  })
})
