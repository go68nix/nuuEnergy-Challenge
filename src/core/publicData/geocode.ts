/**
 * Address geocoding with the OpenStreetMap Nominatim service.
 *
 * The browser calls Nominatim directly. To respect its usage policy (at most one request
 * per second, no bulk use) every address is requested once and kept for the session.
 */

/** A WGS84 position in degrees. */
export type LatLon = { lat: number; lon: number }

/** One geocoded place, with the building outline when OpenStreetMap puts the address on a building. */
export type GeocodedAddress = {
  label: string
  matchedBuilding: boolean
  postalCode?: string
  city?: string
  houseNumber?: string
  coordinates: LatLon
  osmUrl: string
  buildingOutline?: LatLon[]
  tags: Record<string, string>
}

type NominatimResult = {
  osm_type: string
  osm_id: number
  lat: string
  lon: string
  display_name: string
  category: string
  address?: Record<string, string>
  extratags?: Record<string, string> | null
  geojson?: { type: string; coordinates: unknown }
}

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search'
const MAX_MATCHES = 5
const cache = new Map<string, Promise<GeocodedAddress[]>>()

const toGeocodedAddress = (result: NominatimResult): GeocodedAddress => {
  const address = result.address ?? {}
  const city = address.city ?? address.town ?? address.village ?? address.municipality
  const street = [address.road, address.house_number].filter(Boolean).join(' ')
  const place = [address.postcode, city].filter(Boolean).join(' ')
  const matchedBuilding = result.category === 'building'
  const outerRing = matchedBuilding && result.geojson?.type === 'Polygon' ? (result.geojson.coordinates as number[][][])[0] : undefined
  return {
    label: [street, place].filter(Boolean).join(', ') || result.display_name,
    matchedBuilding,
    postalCode: address.postcode,
    city,
    houseNumber: address.house_number,
    coordinates: { lat: Number(result.lat), lon: Number(result.lon) },
    osmUrl: `https://www.openstreetmap.org/${result.osm_type}/${result.osm_id}`,
    buildingOutline: outerRing?.map(([lon, lat]) => ({ lat, lon })),
    tags: result.extratags ?? {},
  }
}

const requestAddresses = async (query: string): Promise<GeocodedAddress[]> => {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    extratags: '1',
    polygon_geojson: '1',
    countrycodes: 'de',
    limit: String(MAX_MATCHES),
    'accept-language': 'de',
  })
  const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params}`)
  if (!response.ok) throw new Error(`Nominatim answered with HTTP ${response.status}`)
  return ((await response.json()) as NominatimResult[]).map(toGeocodedAddress)
}

/**
 * Geocode a free-text German address with Nominatim.
 *
 * :param query: Address, postal code or place as the homeowner typed it.
 * :returns: Up to five matches, best first; empty when Nominatim finds no place.
 * :raises Error: When Nominatim does not answer with a success status.
 */
export const geocodeAddress = (query: string): Promise<GeocodedAddress[]> => {
  const key = query.trim().toLowerCase()
  let pending = cache.get(key)
  if (!pending) {
    pending = requestAddresses(query.trim())
    cache.set(key, pending)
    pending.catch(() => cache.delete(key))
  }
  return pending
}
