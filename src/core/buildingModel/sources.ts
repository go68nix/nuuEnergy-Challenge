/**
 * Live OpenStreetMap sources for the building search.
 *
 * - Photon: a second geocoder on OpenStreetMap data (fast, gives the matched OSM object),
 *   and its reverse search (the nearest address to a building).
 * - OpenFreeMap vector tiles: every building outline around the address (fast, no OSM tags).
 * - Overpass: exact outlines with all OSM tags, such as ``addr:housenumber`` (slow, often busy).
 */

import { VectorTile } from '@mapbox/vector-tile'
import { PbfReader } from 'pbf'
import type { LatLon } from '../publicData/geocode'

/** A building outline from a map source. */
export type MapBuilding = { outline: LatLon[]; heightM?: number; tags: Record<string, string>; osmUrl?: string }

/** One Photon match. */
export type PhotonMatch = { position: LatLon; matchedBuilding: boolean; houseNumber?: string; osmUrl: string }

const PHOTON_URL = 'https://photon.komoot.io/api/'
const PHOTON_REVERSE_URL = 'https://photon.komoot.io/reverse'
const OSM_TYPES: Record<string, string> = { N: 'node', W: 'way', R: 'relation' }

/**
 * Geocode an address with Photon.
 *
 * :param query: Address as the homeowner typed it.
 * :param signal: Aborts the request when the search budget ends.
 * :returns: Matches in Germany, best first.
 * :raises Error: When Photon does not answer with a success status.
 */
export const searchPhoton = async (query: string, signal: AbortSignal): Promise<PhotonMatch[]> => {
  const response = await fetch(`${PHOTON_URL}?${new URLSearchParams({ q: query, limit: '5', lang: 'de' })}`, { signal })
  if (!response.ok) throw new Error(`Photon answered with HTTP ${response.status}`)
  const { features } = (await response.json()) as {
    features: { geometry: { coordinates: [number, number] }; properties: Record<string, string | number> }[]
  }
  return features
    .filter(feature => feature.properties.countrycode === 'DE')
    .map(({ geometry, properties }) => ({
      position: { lat: geometry.coordinates[1], lon: geometry.coordinates[0] },
      matchedBuilding: properties.osm_key === 'building',
      houseNumber: properties.housenumber === undefined ? undefined : String(properties.housenumber),
      osmUrl: `https://www.openstreetmap.org/${OSM_TYPES[String(properties.osm_type)]}/${properties.osm_id}`,
    }))
}

/** The nearest address Photon knows for a position. */
export type NearestAddress = { street?: string; houseNumber?: string }

/**
 * Reverse-geocode a position with Photon.
 *
 * :param position: Position to look up, for example the centre of a building outline.
 * :param signal: Aborts the request when the search budget ends.
 * :returns: The nearest address, or ``undefined`` when Photon knows none.
 * :raises Error: When Photon does not answer with a success status.
 */
export const reversePhoton = async (position: LatLon, signal: AbortSignal): Promise<NearestAddress | undefined> => {
  const params = new URLSearchParams({ lat: String(position.lat), lon: String(position.lon), limit: '1', lang: 'de' })
  const response = await fetch(`${PHOTON_REVERSE_URL}?${params}`, { signal })
  if (!response.ok) throw new Error(`Photon answered with HTTP ${response.status}`)
  const { features } = (await response.json()) as { features: { properties: Record<string, string | number> }[] }
  const properties = features[0]?.properties
  return properties && { street: properties.street as string | undefined, houseNumber: properties.housenumber === undefined ? undefined : String(properties.housenumber) }
}

const TILEJSON_URL = 'https://tiles.openfreemap.org/planet'
const TILE_ZOOM = 14
let tileUrlTemplate: Promise<string> | undefined

const tileIndex = ({ lat, lon }: LatLon) => {
  const n = 2 ** TILE_ZOOM
  const latRad = (lat * Math.PI) / 180
  return { x: Math.floor(((lon + 180) / 360) * n), y: Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n) }
}

const fetchTileTemplate = async () => {
  const response = await fetch(TILEJSON_URL)
  if (!response.ok) throw new Error(`OpenFreeMap answered with HTTP ${response.status}`)
  return ((await response.json()) as { tiles: string[] }).tiles[0]
}

/**
 * Load the building outlines of the OpenFreeMap tiles that cover a square around a position.
 *
 * :param center: Centre of the square.
 * :param radiusM: Half the side of the square in metres.
 * :param signal: Aborts the requests when the search budget ends.
 * :returns: All building outlines in the covering tiles.
 * :raises Error: When OpenFreeMap does not answer with a success status.
 */
export const loadTileBuildings = async (center: LatLon, radiusM: number, signal: AbortSignal): Promise<MapBuilding[]> => {
  if (!tileUrlTemplate) {
    tileUrlTemplate = fetchTileTemplate()
    tileUrlTemplate.catch(() => (tileUrlTemplate = undefined))
  }
  const template = await tileUrlTemplate
  const dLat = radiusM / 111320
  const dLon = dLat / Math.cos((center.lat * Math.PI) / 180)
  const from = tileIndex({ lat: center.lat + dLat, lon: center.lon - dLon })
  const to = tileIndex({ lat: center.lat - dLat, lon: center.lon + dLon })
  const tiles = []
  for (let x = from.x; x <= to.x; x++) for (let y = from.y; y <= to.y; y++) tiles.push({ x, y })

  const perTile = await Promise.all(tiles.map(async ({ x, y }) => {
    const response = await fetch(template.replace('{z}', String(TILE_ZOOM)).replace('{x}', String(x)).replace('{y}', String(y)), { signal })
    if (!response.ok) throw new Error(`OpenFreeMap answered with HTTP ${response.status}`)
    const layer = new VectorTile(new PbfReader(await response.arrayBuffer())).layers.building
    const buildings: MapBuilding[] = []
    for (let i = 0; i < (layer?.length ?? 0); i++) {
      const feature = layer.feature(i)
      const { geometry } = feature.toGeoJSON(x, y, TILE_ZOOM)
      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : []
      const heightM = Number(feature.properties.render_height) || undefined
      for (const polygon of polygons) buildings.push({ outline: polygon[0].map(([lon, lat]) => ({ lat, lon })), heightM, tags: {} })
    }
    return buildings
  }))
  return perTile.flat()
}

const OVERPASS_URLS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']

type OverpassResponse = { elements: { id: number; tags?: Record<string, string>; geometry?: LatLon[] }[] }

/**
 * Load exact building outlines with their OSM tags from Overpass; the first server to answer wins.
 *
 * :param center: Centre of the search circle.
 * :param radiusM: Radius of the search circle in metres.
 * :param signal: Aborts the requests when the search budget ends.
 * :returns: Building outlines with tags.
 * :raises AggregateError: When no Overpass server answers.
 */
export const loadOverpassBuildings = async (center: LatLon, radiusM: number, signal: AbortSignal): Promise<MapBuilding[]> => {
  const query = `[out:json][timeout:15];way["building"](around:${radiusM},${center.lat},${center.lon});out tags geom;`
  const data = await Promise.any(OVERPASS_URLS.map(async url => {
    const response = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: query }), signal })
    if (!response.ok) throw new Error(`Overpass answered with HTTP ${response.status}`)
    return (await response.json()) as OverpassResponse
  }))
  return data.elements.flatMap(element => element.geometry
    ? [{ outline: element.geometry, tags: element.tags ?? {}, osmUrl: `https://www.openstreetmap.org/way/${element.id}` }]
    : [])
}
