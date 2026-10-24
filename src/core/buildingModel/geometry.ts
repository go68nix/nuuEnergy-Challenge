/**
 * Planar geometry for building outlines in local metres.
 *
 * Outlines span tens of metres, so an equirectangular projection around one origin keeps
 * the projection error far below the accuracy of the map data.
 */

import type { LatLon } from '../publicData/geocode'

/** A point in metres east (x) and north (y) of the origin. */
export type Point = { x: number; y: number }

const METRES_PER_DEGREE = 6371008.8 * (Math.PI / 180)

/**
 * Create a projection from WGS84 to local metres around an origin.
 *
 * :param origin: The position that maps to (0, 0).
 * :returns: A function that projects one position.
 */
export const localProjection = (origin: LatLon) => {
  const metresPerDegreeLon = METRES_PER_DEGREE * Math.cos((origin.lat * Math.PI) / 180)
  return ({ lat, lon }: LatLon): Point => ({ x: (lon - origin.lon) * metresPerDegreeLon, y: (lat - origin.lat) * METRES_PER_DEGREE })
}

/**
 * Convert a local point back to WGS84.
 *
 * :param origin: The position that maps to (0, 0).
 * :param point: Point in local metres.
 * :returns: The WGS84 position.
 */
export const toLatLon = (origin: LatLon, point: Point): LatLon => ({
  lat: origin.lat + point.y / METRES_PER_DEGREE,
  lon: origin.lon + point.x / (METRES_PER_DEGREE * Math.cos((origin.lat * Math.PI) / 180)),
})

/**
 * Compute the signed area of a ring.
 *
 * :param ring: Outline without a repeated closing point.
 * :returns: Area in m², positive when the ring runs counter-clockwise.
 */
export const signedArea = (ring: Point[]) =>
  ring.reduce((sum, p, i) => {
    const q = ring[(i + 1) % ring.length]
    return sum + p.x * q.y - q.x * p.y
  }, 0) / 2

/**
 * Drop repeated points (also the closing point) of an outline and make it run counter-clockwise.
 *
 * :param ring: Outline as delivered by the data source.
 * :returns: Open, counter-clockwise ring.
 */
export const normaliseRing = (ring: Point[]): Point[] => {
  const open = ring.filter((p, i) => {
    const next = ring[(i + 1) % ring.length]
    return Math.hypot(next.x - p.x, next.y - p.y) > 0.01
  })
  return signedArea(open) < 0 ? [...open].reverse() : open
}

/**
 * Compute the area centroid of a counter-clockwise ring.
 *
 * :param ring: Open, counter-clockwise ring with a non-zero area.
 * :returns: Centroid point.
 */
export const centroid = (ring: Point[]): Point => {
  let cx = 0
  let cy = 0
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length]
    const cross = p.x * q.y - q.x * p.y
    cx += (p.x + q.x) * cross
    cy += (p.y + q.y) * cross
  })
  const factor = 6 * signedArea(ring)
  return { x: cx / factor, y: cy / factor }
}

/**
 * Test whether a point lies inside a ring (ray casting).
 *
 * :param ring: Open ring.
 * :param p: Point to test.
 * :returns: ``true`` when the point is inside.
 */
export const containsPoint = (ring: Point[], p: Point) => {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]
    const b = ring[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

const closestOnSegment = (p: Point, a: Point, b: Point): Point => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared))
  return { x: a.x + t * dx, y: a.y + t * dy }
}

/**
 * Compute the distance from a point to a segment.
 *
 * :param p: Point.
 * :param a: Segment start.
 * :param b: Segment end.
 * :returns: Distance in metres.
 */
export const distanceToSegment = (p: Point, a: Point, b: Point) => {
  const closest = closestOnSegment(p, a, b)
  return Math.hypot(p.x - closest.x, p.y - closest.y)
}

/**
 * Find the point on a ring's outline that is closest to a point.
 *
 * :param ring: Open ring.
 * :param p: Point.
 * :returns: The closest outline point and its distance in metres.
 */
export const closestOnOutline = (ring: Point[], p: Point) =>
  ring
    .map((a, i) => closestOnSegment(p, a, ring[(i + 1) % ring.length]))
    .map(point => ({ point, distance: Math.hypot(p.x - point.x, p.y - point.y) }))
    .reduce((best, next) => (next.distance < best.distance ? next : best))

/**
 * Compute the distance from a point to the outline of a ring.
 *
 * :param ring: Open ring.
 * :param p: Point.
 * :returns: Distance in metres to the nearest edge (also for points inside).
 */
export const distanceToOutline = (ring: Point[], p: Point) =>
  Math.min(...ring.map((a, i) => distanceToSegment(p, a, ring[(i + 1) % ring.length])))

/**
 * Compute the distance from a point to a building footprint.
 *
 * :param ring: Open ring.
 * :param p: Point.
 * :returns: 0 inside the footprint, else the distance to its outline in metres.
 */
export const distanceToFootprint = (ring: Point[], p: Point) => (containsPoint(ring, p) ? 0 : distanceToOutline(ring, p))

/**
 * Tell whether two outlines show the same building (the centroid of one lies inside the other).
 *
 * :param a: Open, counter-clockwise ring.
 * :param b: Open, counter-clockwise ring.
 * :returns: ``true`` for the same building, also across sources with slightly different outlines.
 */
export const sameOutline = (a: Point[], b: Point[]) => containsPoint(a, centroid(b)) || containsPoint(b, centroid(a))
