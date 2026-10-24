/**
 * Building geometry resolution from OpenStreetMap (OSM) with offline synthetic fallback.
 *
 * Resolves building footprint area, estimated stories, and shared walls topology
 * to verify homeowner-reported dimensions against open geospatial data.
 */

import type { AddressComponents } from './siftMctsSearch'
import type { BuildingGeometry } from './types'

/**
 * Synchronously estimate building geometry features based on address components and cadastre priors.
 *
 * :param components: Parsed address components.
 * :returns: Resolved BuildingGeometry object.
 */
export const resolveBuildingGeometrySync = (
  components: AddressComponents,
): BuildingGeometry => {
  const isPlzOnly = components.queryType === 'plz'
  const isTerracePattern = components.street ? /ring|reihe|zeile|steig|gasse/i.test(components.street) : false

  if (isPlzOnly) {
    return {
      footprintM2: 95,
      estimatedStories: 2,
      estimatedGrossFloorAreaM2: 150,
      buildingTypeEstimate: 'single_two_family',
      sharedWallsCount: 0,
      source: 'Geospatial Prior (Regional PLZ Baseline)',
    }
  }

  if (isTerracePattern) {
    return {
      footprintM2: 68,
      estimatedStories: 2,
      estimatedGrossFloorAreaM2: 125,
      buildingTypeEstimate: 'mid_terrace',
      sharedWallsCount: 2,
      source: 'Geospatial Heuristic (Urban Cadastre Prior)',
    }
  }

  return {
    footprintM2: 92,
    estimatedStories: 2,
    estimatedGrossFloorAreaM2: 148,
    buildingTypeEstimate: 'single_two_family',
    sharedWallsCount: 0,
    source: 'Geospatial Heuristic (Standard Residential Cadastre Prior)',
  }
}

/**
 * Estimate building geometry features based on address components and building priors.
 *
 * :param components: Parsed address components.
 * :returns: Resolved BuildingGeometry object.
 */
export const resolveBuildingGeometry = async (
  components: AddressComponents,
): Promise<BuildingGeometry> => {
  // If we have an exact address, attempt a brief fetch if network is available
  if (components.postalCode && components.street && typeof fetch === 'function') {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 600)
      const q = encodeURIComponent(`${components.street} ${components.houseNumber ?? ''}, ${components.postalCode} Deutschland`)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&polygon_geojson=1`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'nuuEnergy-PublicData-Check/1.0' },
      })
      clearTimeout(timeoutId)
      if (res.ok) {
        const json = await res.json() as Array<{ boundingbox?: string[]; lat?: string; lon?: string; type?: string }>
        if (json.length > 0 && json[0].boundingbox) {
          const latitude = Number(json[0].lat)
          const longitude = Number(json[0].lon)
          const [latMin, latMax, lonMin, lonMax] = json[0].boundingbox.map(Number)
          const dLatMeters = Math.abs(latMax - latMin) * 111320
          const dLonMeters = Math.abs(lonMax - lonMin) * 71000
          const roughArea = Math.round(dLatMeters * dLonMeters)
          if (roughArea >= 35 && roughArea <= 1500) {
            return {
              coordinates: Number.isFinite(latitude) && Number.isFinite(longitude) ? { lat: latitude, lon: longitude } : undefined,
              footprintM2: roughArea,
              estimatedStories: 2,
              estimatedGrossFloorAreaM2: Math.round(roughArea * 1.6),
              buildingTypeEstimate: roughArea < 80 ? 'mid_terrace' : roughArea < 130 ? 'single_two_family' : 'apartment',
              sharedWallsCount: roughArea < 80 ? 2 : 0,
              source: 'OpenStreetMap (Nominatim Geocoded Footprint)',
            }
          }
        }
      }
    } catch {
      // Fall through to deterministic offline fallback
    }
  }
  return resolveBuildingGeometrySync(components)
}
