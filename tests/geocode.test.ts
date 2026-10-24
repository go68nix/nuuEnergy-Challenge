import { afterEach, describe, expect, it, vi } from 'vitest'
import { geocodeAddress } from '../src/core/publicData/geocode'
import { lookupPublicData } from '../src/core/publicData/service'

const buildingResult = {
  osm_type: 'way',
  osm_id: 87646771,
  lat: '48.36798',
  lon: '10.89783',
  display_name: '10, Maximilianstraße, Innenstadt, Augsburg, Bayern, 86150, Deutschland',
  category: 'building',
  address: { road: 'Maximilianstraße', house_number: '10', postcode: '86150', city: 'Augsburg' },
  extratags: { 'building:levels': '6' },
  geojson: { type: 'Polygon', coordinates: [[[10.8977, 48.3679], [10.8979, 48.3679], [10.8979, 48.3681], [10.8977, 48.3679]]] },
}

const stubNominatim = (results: unknown[]) => {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL) => Response.json(results))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('geocodeAddress', () => {
  it('reads the place, the building outline and its OSM tags from Nominatim', async () => {
    const fetchMock = stubNominatim([buildingResult])
    const [place] = await geocodeAddress('Maximilianstraße 10, 86150 Augsburg')
    expect(place?.matchedBuilding).toBe(true)
    expect(place?.label).toBe('Maximilianstraße 10, 86150 Augsburg')
    expect(place?.buildingOutline).toHaveLength(4)
    expect(place?.buildingOutline?.[0]).toEqual({ lat: 48.3679, lon: 10.8977 })
    expect(place?.tags['building:levels']).toBe('6')
    expect(place?.osmUrl).toBe('https://www.openstreetmap.org/way/87646771')
    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.searchParams.get('countrycodes')).toBe('de')
    expect(url.searchParams.get('polygon_geojson')).toBe('1')
  })

  it('gives no building outline when the address is only a point', async () => {
    stubNominatim([{ ...buildingResult, osm_type: 'node', category: 'place', geojson: { type: 'Point', coordinates: [10.8978, 48.368] } }])
    const [place] = await geocodeAddress('Rathausplatz 1, 86150 Augsburg')
    expect(place?.matchedBuilding).toBe(false)
    expect(place?.buildingOutline).toBeUndefined()
  })

  it('asks Nominatim only once for the same address', async () => {
    const fetchMock = stubNominatim([buildingResult])
    await geocodeAddress('Karlstraße 3, 86150 Augsburg')
    await geocodeAddress('  karlstraße 3, 86150 augsburg ')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('lookupPublicData', () => {
  it('takes the place from Nominatim instead of building it from the typed text', async () => {
    stubNominatim([buildingResult])
    const pd = await lookupPublicData('Maximilianstr 10 Augsburg')
    expect(pd.formattedAddress).toBe('Maximilianstraße 10, 86150 Augsburg')
    expect(pd.postalCode).toBe('86150')
    expect(pd.coordinates).toEqual({ lat: 48.36798, lon: 10.89783 })
  })

  it('fails when Nominatim knows no place for the input', async () => {
    stubNominatim([])
    await expect(lookupPublicData('Nirgendwostraße 999')).rejects.toThrow('No place found')
  })
})
