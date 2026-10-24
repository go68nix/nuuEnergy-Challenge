/**
 * Where the heating may be and where the heat pump outdoor unit could stand.
 *
 * Radiator zones: exterior walls that touch no neighbour, one band per storey at the usual
 * radiator height; underfloor heating shows as floor zones. Public data has no rooms or windows,
 * so a zone means "a radiator may hang on this wall", never a measured radiator.
 *
 * Outdoor unit spots: points in front of free exterior walls, ranked by the distance to the nearest
 * neighbour building. Each spot gets the highest sound power level that keeps the TA Lärm night
 * limit at that neighbour's facade, from free-field point-source spreading
 * L_p = L_W + 10 lg(Q / 4πr²) with Q = 4 (unit on the ground in front of one wall). Barriers,
 * reflections from other walls and tonal surcharges are not modelled.
 */

import type { BuildingInput } from '../types'
import { closestOnOutline, containsPoint, type Point } from './geometry'
import type { BuildingModel, Wall } from './model'

/** Usual radiator band above the floor of a storey (assumption, not measured). */
const RADIATOR_BAND = { fromM: 0.15, toM: 0.9 }
const MIN_RADIATOR_WALL_M = 1
/** The unit stands about this far in front of the wall and needs this much free wall. */
const UNIT_WALL_OFFSET_M = 0.6
const MIN_UNIT_WALL_M = 1.5
const UNIT_END_CLEARANCE_M = 0.75
const SPOT_STEP_M = 1
const DIRECTIVITY_IN_FRONT_OF_WALL = 4
const MAX_SPOTS = 3
/** TA Lärm 6.1 night limits (22-06 h), checked in the official text on 2026-10-24. */
export const NIGHT_LIMITS_DB = { pureResidential: 35, generalResidential: 40 } as const

/** A possible radiator band on a wall, or a possible underfloor heating zone on a storey. */
export type RadiatorZone =
  | { kind: 'wall'; wall: Wall; level: number; bottomM: number; topM: number }
  | { kind: 'floor'; level: number; elevationM: number }

/** A possible place for the heat pump outdoor unit. */
export type OutdoorUnitSpot = {
  rank: number
  position: Point
  wall: Wall
  nearestNeighbour?: { distanceM: number; point: Point }
  maxSoundPowerDb?: Record<keyof typeof NIGHT_LIMITS_DB, number>
}

/**
 * Compute the highest sound power level that keeps a limit at a distance.
 *
 * :param limitDb: Night limit at the neighbour in dB(A).
 * :param distanceM: Distance from the unit to the neighbour facade in metres.
 * :returns: Highest sound power level L_W in dB(A).
 */
export const maxSoundPowerDb = (limitDb: number, distanceM: number) =>
  limitDb + 10 * Math.log10((4 * Math.PI * distanceM ** 2) / DIRECTIVITY_IN_FRONT_OF_WALL)

/**
 * List the possible radiator and underfloor zones of the building.
 *
 * :param model: The building model.
 * :param distribution: Heating distribution from the questionnaire; unknown shows radiator walls.
 * :returns: Wall bands per storey and floor zones per storey.
 */
export const radiatorZones = (model: BuildingModel, distribution?: BuildingInput['heatingDistribution']): RadiatorZone[] => {
  const storeyHeightM = model.heightM / model.levels
  const levels = Array.from({ length: model.levels }, (_, level) => level)
  const walls = distribution === 'underfloor' ? [] : model.walls.filter(wall => !wall.shared && wall.lengthM >= MIN_RADIATOR_WALL_M)
  const wallZones = levels.flatMap(level => walls.map(wall => ({
    kind: 'wall' as const,
    wall,
    level,
    bottomM: level * storeyHeightM + RADIATOR_BAND.fromM,
    topM: level * storeyHeightM + RADIATOR_BAND.toM,
  })))
  const floorZones = distribution === 'underfloor' || distribution === 'mixed'
    ? levels.map(level => ({ kind: 'floor' as const, level, elevationM: level * storeyHeightM }))
    : []
  return [...wallZones, ...floorZones]
}

const nearestNeighbour = (model: BuildingModel, position: Point) => {
  const options = model.neighbours.map(neighbour => closestOnOutline(neighbour.ring, position))
  if (!options.length) return undefined
  const best = options.reduce((a, b) => (b.distance < a.distance ? b : a))
  return { distanceM: best.distance, point: best.point }
}

/**
 * Rank possible outdoor unit spots, the quietest for the neighbours first.
 *
 * :param model: The building model.
 * :returns: At most three spots, one per wall, farthest from any neighbour building first.
 */
export const outdoorUnitSpots = (model: BuildingModel): OutdoorUnitSpot[] => {
  const blocked = [model.footprint, ...model.neighbours.map(neighbour => neighbour.ring)]
  const bestPerWall = model.walls
    .filter(wall => !wall.shared && wall.lengthM >= MIN_UNIT_WALL_M)
    .flatMap(wall => {
      const along = { x: (wall.b.x - wall.a.x) / wall.lengthM, y: (wall.b.y - wall.a.y) / wall.lengthM }
      const spots: Omit<OutdoorUnitSpot, 'rank' | 'maxSoundPowerDb'>[] = []
      for (let t = UNIT_END_CLEARANCE_M; t <= wall.lengthM - UNIT_END_CLEARANCE_M + 1e-9; t += SPOT_STEP_M) {
        const position = {
          x: wall.a.x + along.x * t + wall.outward.x * UNIT_WALL_OFFSET_M,
          y: wall.a.y + along.y * t + wall.outward.y * UNIT_WALL_OFFSET_M,
        }
        if (!blocked.some(ring => containsPoint(ring, position))) spots.push({ wall, position, nearestNeighbour: nearestNeighbour(model, position) })
      }
      const distance = (spot: (typeof spots)[number]) => spot.nearestNeighbour?.distanceM ?? Number.POSITIVE_INFINITY
      return spots.length ? [spots.reduce((a, b) => (distance(b) > distance(a) ? b : a))] : []
    })
  return bestPerWall
    .sort((a, b) => (b.nearestNeighbour?.distanceM ?? Number.POSITIVE_INFINITY) - (a.nearestNeighbour?.distanceM ?? Number.POSITIVE_INFINITY))
    .slice(0, MAX_SPOTS)
    .map((spot, i) => ({
      ...spot,
      rank: i + 1,
      maxSoundPowerDb: spot.nearestNeighbour && {
        pureResidential: maxSoundPowerDb(NIGHT_LIMITS_DB.pureResidential, spot.nearestNeighbour.distanceM),
        generalResidential: maxSoundPowerDb(NIGHT_LIMITS_DB.generalResidential, spot.nearestNeighbour.distanceM),
      },
    }))
}
