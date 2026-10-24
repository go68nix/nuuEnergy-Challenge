import { describe, expect, it } from 'vitest'
import { distanceToFootprint, localProjection, normaliseRing, type Point, toLatLon } from '../src/core/buildingModel/geometry'
import { buildWalls, storeys, touchingNeighbours } from '../src/core/buildingModel/model'

const square = (x: number, y: number, size: number): Point[] =>
  normaliseRing([{ x, y }, { x: x + size, y }, { x: x + size, y: y + size }, { x, y: y + size }])

describe('building geometry', () => {
  it('turns a closed clockwise OSM outline into an open counter-clockwise ring', () => {
    const ring = normaliseRing([{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 0 }, { x: 0, y: 0 }])
    expect(ring).toEqual([{ x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }])
  })

  it('projects to local metres and back without drift', () => {
    const origin = { lat: 48.1, lon: 11.6 }
    const point = localProjection(origin)({ lat: 48.101, lon: 11.601 })
    expect(point.y).toBeCloseTo(111.195, 2)
    expect(point.x).toBeCloseTo(74.26, 2)
    const back = toLatLon(origin, point)
    expect(back.lat).toBeCloseTo(48.101, 9)
    expect(back.lon).toBeCloseTo(11.601, 9)
  })

  it('measures zero inside a footprint and the wall distance outside', () => {
    expect(distanceToFootprint(square(0, 0, 10), { x: 5, y: 5 })).toBe(0)
    expect(distanceToFootprint(square(0, 0, 10), { x: 13, y: 5 })).toBeCloseTo(3)
  })
})

describe('building model', () => {
  it('marks the wall against the neighbour as shared and gives each wall its compass direction', () => {
    const walls = buildWalls(square(0, 0, 10), [square(10, 0, 10)])
    expect(walls.map(wall => Math.round(wall.facingDeg))).toEqual([180, 90, 0, 270])
    expect(walls.map(wall => wall.shared)).toEqual([false, true, false, false])
  })

  it('does not treat a house 3 m away as a party wall', () => {
    expect(buildWalls(square(0, 0, 10), [square(13, 0, 10)]).some(wall => wall.shared)).toBe(false)
  })

  it('counts the touching neighbours in a terrace row', () => {
    const [end, middle, otherEnd] = [square(0, 0, 10), square(10, 0, 10), square(20, 0, 10)]
    expect(touchingNeighbours(middle, [end, otherEnd])).toBe(2)
    expect(touchingNeighbours(end, [middle, otherEnd])).toBe(1)
  })

  it('takes storeys from OSM tags first and derives them from the heated area only without tags', () => {
    expect(storeys({ 'building:levels': '3' }, 140, 100)).toEqual({ levels: 3, heightM: 9, source: 'osm_levels' })
    expect(storeys({ height: '7.5' }, 140, 100)).toEqual({ levels: 3, heightM: 7.5, source: 'osm_height' })
    expect(storeys({}, 140, 100)).toEqual({ levels: 1, heightM: 3, source: 'heated_area' })
  })

  it('reads storeys from the tile height, but not from the 5 m default for buildings without data', () => {
    expect(storeys({}, 140, 4800, 19)).toEqual({ levels: 5, heightM: 19, source: 'osm_tiles' })
    expect(storeys({}, 140, 100, 5)).toEqual({ levels: 1, heightM: 3, source: 'heated_area' })
  })
})
