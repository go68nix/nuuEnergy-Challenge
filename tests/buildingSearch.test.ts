import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { containsPoint, localProjection, type Point, toLatLon } from '../src/core/buildingModel/geometry'
import { searchBuilding } from '../src/core/buildingModel/search'
import * as sources from '../src/core/buildingModel/sources'

vi.mock('../src/core/buildingModel/sources', () => ({
  loadTileBuildings: vi.fn(),
  searchPhoton: vi.fn(),
  reversePhoton: vi.fn(),
  loadOverpassBuildings: vi.fn(),
}))

const origin = { lat: 48.12, lon: 11.66 }
const square = (x: number, y: number, size: number): Point[] => [{ x, y }, { x: x + size, y }, { x: x + size, y: y + size }, { x, y: y + size }]
const toOutline = (ring: Point[]) => ring.map(point => toLatLon(origin, point))
const house = square(0, 0, 10)
const detachedNeighbour = square(14, 0, 10)
const attachedNeighbour = square(-10, 0, 10)

const nominatimResult = (point: Point, extra: Record<string, unknown> = {}) => {
  const { lat, lon } = toLatLon(origin, point)
  return { osm_type: 'node', osm_id: 1, lat: String(lat), lon: String(lon), display_name: 'Teststraße 6', category: 'place', address: { road: 'Teststraße', house_number: '6', postcode: '81825', city: 'München' }, ...extra }
}

beforeEach(() => {
  vi.mocked(sources.loadTileBuildings).mockResolvedValue([house, detachedNeighbour, attachedNeighbour].map(ring => ({ outline: toOutline(ring), tags: {} })))
  vi.mocked(sources.loadOverpassBuildings).mockRejectedValue(new Error('busy'))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('searchBuilding', () => {
  it('stops after the harvest when Nominatim returns the building that carries the address', async () => {
    const polygon = { type: 'Polygon', coordinates: [toOutline([...house, house[0]]).map(({ lat, lon }) => [lon, lat])] }
    vi.stubGlobal('fetch', vi.fn(async () => Response.json([nominatimResult({ x: 5, y: 5 }, { osm_type: 'way', osm_id: 100, category: 'building', geojson: polygon })])))

    const result = await searchBuilding('Teststraße 6, 81825 München (building)', { heatedFloorAreaM2: 140 })

    expect(result.matchedBy).toBe('geocoder')
    expect(result.osmUrl).toBe('https://www.openstreetmap.org/way/100')
    expect(result.trace.map(step => step.source)).toEqual(['Nominatim', 'OpenFreeMap tiles'])
    expect(sources.searchPhoton).not.toHaveBeenCalled()
    expect(result.model.walls.filter(wall => wall.shared)).toHaveLength(1)
  })

  it('settles an address node with Photon reverse geocoding and never waits for Overpass', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json([nominatimResult({ x: 5, y: 0 })])))
    vi.mocked(sources.searchPhoton).mockResolvedValue([])
    const project = localProjection(origin)
    vi.mocked(sources.reversePhoton).mockImplementation(async position =>
      containsPoint(house, project(position)) ? { street: 'Teststraße', houseNumber: '6' } : { street: 'Teststraße', houseNumber: '8' })

    const result = await searchBuilding('Teststraße 6, 81825 München (node)', { heatedFloorAreaM2: 140 })

    expect(result.trace.map(step => step.source)).toEqual(['Nominatim', 'OpenFreeMap tiles', 'Photon', 'Photon reverse'])
    expect(sources.loadOverpassBuildings).not.toHaveBeenCalled()
    expect(result.matchedBy).toBe('judges')
    expect(result.ranking.confidence).toBeCloseTo(0.8)
    expect(result.model.footprintAreaM2).toBeCloseTo(100, 0)
  })

  it('reports an unsettled match with alternatives when no source adds evidence', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json([nominatimResult({ x: 5, y: 0 })])))
    vi.mocked(sources.searchPhoton).mockResolvedValue([])
    vi.mocked(sources.reversePhoton).mockResolvedValue(undefined)

    const result = await searchBuilding('Teststraße 6, 81825 München (no evidence)', { heatedFloorAreaM2: 140 })

    expect(result.trace.at(-1)?.outcome).toContain('no answer')
    expect(result.matchedBy).toBe('unsettled')
    expect(result.alternatives.length).toBeGreaterThan(0)
  })

  it('builds no model when the address has no house number', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json([{ ...nominatimResult({ x: 5, y: 0 }), address: { postcode: '81825', city: 'München' } }])))

    await expect(searchBuilding('81825 München', { heatedFloorAreaM2: 140 })).rejects.toThrow('No exact address')
    expect(sources.loadTileBuildings).not.toHaveBeenCalled()
  })
})
