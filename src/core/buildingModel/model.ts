/**
 * The building model: the footprint of the target building, its walls and its neighbours.
 */

import { distanceToOutline, type Point, signedArea } from './geometry'

/** Assumed storey height including the slab, used when OpenStreetMap has no height. */
export const STOREY_HEIGHT_M = 3
/** A wall counts as shared when most of it lies this close to a neighbour outline (map accuracy). */
const SHARED_WALL_TOLERANCE_M = 0.6
const SHARED_WALL_SAMPLE_STEP_M = 0.5

/** One outer wall of the footprint, from corner ``a`` to corner ``b``. */
export type Wall = { index: number; a: Point; b: Point; lengthM: number; outward: Point; facingDeg: number; shared: boolean }

/** A neighbouring building, shown for context and used for party walls and noise distances. */
export type Neighbour = { ring: Point[]; heightM: number }

/** Where the number of storeys comes from. */
export type StoreysSource = 'osm_levels' | 'osm_height' | 'heated_area'

/** The target building in local metres. */
export type BuildingModel = {
  footprint: Point[]
  footprintAreaM2: number
  levels: number
  levelsSource: StoreysSource
  heightM: number
  walls: Wall[]
  neighbours: Neighbour[]
}

const sharedFraction = (a: Point, b: Point, neighbours: Point[][]) => {
  const samples = Math.max(3, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / SHARED_WALL_SAMPLE_STEP_M))
  let near = 0
  for (let i = 1; i <= samples; i++) {
    const t = i / (samples + 1)
    const p = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }
    if (neighbours.some(ring => distanceToOutline(ring, p) <= SHARED_WALL_TOLERANCE_M)) near++
  }
  return near / samples
}

const boundsTouch = (a: Point[], b: Point[]) => {
  const xs = (ring: Point[]) => ring.map(p => p.x)
  const ys = (ring: Point[]) => ring.map(p => p.y)
  const m = SHARED_WALL_TOLERANCE_M
  return Math.min(...xs(a)) - m <= Math.max(...xs(b)) && Math.min(...xs(b)) - m <= Math.max(...xs(a)) &&
    Math.min(...ys(a)) - m <= Math.max(...ys(b)) && Math.min(...ys(b)) - m <= Math.max(...ys(a))
}

/**
 * Split a footprint into walls and mark the walls that touch a neighbour.
 *
 * :param footprint: Open, counter-clockwise ring of the target building.
 * :param neighbours: Outlines of the other buildings nearby.
 * :returns: One wall per footprint edge.
 */
export const buildWalls = (footprint: Point[], neighbours: Point[][]): Wall[] => {
  const touching = neighbours.filter(ring => boundsTouch(footprint, ring))
  return footprint.map((a, index) => {
    const b = footprint[(index + 1) % footprint.length]
    const lengthM = Math.hypot(b.x - a.x, b.y - a.y)
    const outward = { x: (b.y - a.y) / lengthM, y: -(b.x - a.x) / lengthM }
    const facingDeg = ((Math.atan2(outward.x, outward.y) * 180) / Math.PI + 360) % 360
    return { index, a, b, lengthM, outward, facingDeg, shared: sharedFraction(a, b, touching) >= 0.5 }
  })
}

/**
 * Count the neighbouring buildings that share at least one wall with a footprint.
 *
 * :param footprint: Open, counter-clockwise ring.
 * :param neighbours: Outlines of the other buildings nearby.
 * :returns: Number of touching neighbours (0 detached, 1 semi-detached or end of terrace, 2+ mid-terrace).
 */
export const touchingNeighbours = (footprint: Point[], neighbours: Point[][]) =>
  neighbours.filter(ring => boundsTouch(footprint, ring) &&
    footprint.some((a, i) => sharedFraction(a, footprint[(i + 1) % footprint.length], [ring]) >= 0.5)).length

/**
 * Decide the number of storeys and the height of the target building.
 *
 * :param tags: OpenStreetMap tags of the building; empty when the source has none.
 * :param heatedFloorAreaM2: Heated living area from the questionnaire.
 * :param footprintAreaM2: Footprint area of the building.
 * :returns: Storeys, height in metres and the source of the storey count.
 */
export const storeys = (tags: Record<string, string>, heatedFloorAreaM2: number, footprintAreaM2: number) => {
  const levels = Number.parseFloat(tags['building:levels'] ?? '')
  const height = Number.parseFloat(tags.height ?? '')
  if (levels > 0) {
    const rounded = Math.round(levels)
    return { levels: rounded, heightM: height > 0 ? height : rounded * STOREY_HEIGHT_M, source: 'osm_levels' as const }
  }
  if (height > 0) return { levels: Math.max(1, Math.round(height / STOREY_HEIGHT_M)), heightM: height, source: 'osm_height' as const }
  const derived = Math.max(1, Math.round(heatedFloorAreaM2 / footprintAreaM2))
  return { levels: derived, heightM: derived * STOREY_HEIGHT_M, source: 'heated_area' as const }
}

/**
 * Assemble the building model of the target building.
 *
 * :param footprint: Open, counter-clockwise ring of the target building.
 * :param neighbours: Neighbouring buildings within the search radius.
 * :param tags: OpenStreetMap tags of the target building.
 * :param heatedFloorAreaM2: Heated living area from the questionnaire.
 * :returns: The building model.
 */
export const buildModel = (
  footprint: Point[],
  neighbours: Neighbour[],
  tags: Record<string, string>,
  heatedFloorAreaM2: number,
): BuildingModel => {
  const footprintAreaM2 = signedArea(footprint)
  const { levels, heightM, source } = storeys(tags, heatedFloorAreaM2, footprintAreaM2)
  return {
    footprint,
    footprintAreaM2,
    levels,
    levelsSource: source,
    heightM,
    walls: buildWalls(footprint, neighbours.map(neighbour => neighbour.ring)),
    neighbours,
  }
}
