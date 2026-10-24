import { describe, expect, it } from 'vitest'
import { normaliseRing, type Point } from '../src/core/buildingModel/geometry'
import { buildModel } from '../src/core/buildingModel/model'
import { maxSoundPowerDb, outdoorUnitSpots, radiatorZones } from '../src/core/buildingModel/placement'

const square = (x: number, y: number, size: number): Point[] =>
  normaliseRing([{ x, y }, { x: x + size, y }, { x: x + size, y: y + size }, { x, y: y + size }])

const twoStoreyHouseWithNeighbour = (neighbour: Point[]) =>
  buildModel(square(0, 0, 10), [{ ring: neighbour, heightM: 6 }], { 'building:levels': '2' }, 140)

describe('radiator zones', () => {
  it('puts one band per storey on every free exterior wall and none on the party wall', () => {
    const zones = radiatorZones(twoStoreyHouseWithNeighbour(square(10, 0, 10)), 'radiator')
    expect(zones).toHaveLength(6)
    expect(zones.every(zone => zone.kind === 'wall' && !zone.wall.shared)).toBe(true)
    expect(zones.filter(zone => zone.kind === 'wall' && zone.level === 1).map(zone => zone.kind === 'wall' && zone.bottomM)).toEqual([3.15, 3.15, 3.15])
  })

  it('shows floor zones instead of wall bands for underfloor heating', () => {
    const zones = radiatorZones(twoStoreyHouseWithNeighbour(square(10, 0, 10)), 'underfloor')
    expect(zones.map(zone => zone.kind)).toEqual(['floor', 'floor'])
  })
})

describe('outdoor unit spots', () => {
  it('ranks the spot on the wall facing away from the neighbour first', () => {
    const spots = outdoorUnitSpots(twoStoreyHouseWithNeighbour(square(15, 0, 10)))
    expect(Math.round(spots[0].wall.facingDeg)).toBe(270)
    expect(spots[0].nearestNeighbour?.distanceM).toBeCloseTo(15.6)
    expect(spots.map(spot => spot.rank)).toEqual([1, 2, 3])
  })

  it('places units only in front of the two free walls of a mid-terrace house', () => {
    const midTerrace = buildModel(square(0, 0, 10), [{ ring: square(-10, 0, 10), heightM: 6 }, { ring: square(10, 0, 10), heightM: 6 }], {}, 140)
    const spots = outdoorUnitSpots(midTerrace)
    expect(spots.map(spot => Math.round(spot.wall.facingDeg)).sort()).toEqual([0, 180])
  })

  it('allows 6 dB more sound power for each doubling of the distance to the neighbour', () => {
    expect(maxSoundPowerDb(35, 5)).toBeCloseTo(53.95, 2)
    expect(maxSoundPowerDb(35, 10) - maxSoundPowerDb(35, 5)).toBeCloseTo(6.02, 2)
  })
})
