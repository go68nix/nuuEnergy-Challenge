/**
 * Building search for one exact address.
 *
 * 1. Harvest: Nominatim matches for the address, then all OpenFreeMap building outlines around it.
 * 2. SIFT: hard gates on the outlines, then pairwise judges and a Bradley-Terry ranking.
 * 3. AB-MCTS: while the winner is not settled, pick the next source by UCB per expected second,
 *    either wider (Photon, another geocoder) or deeper (more evidence on the top candidates).
 * The stop rule and the time budget are fixed before the search starts.
 */

import { type GeocodedAddress, geocodeAddress, type LatLon } from '../publicData/geocode'
import type { BuildingInput } from '../types'
import { centroid, distanceToFootprint, localProjection, normaliseRing, type Point, sameOutline, signedArea, toLatLon } from './geometry'
import { type BuildingModel, buildModel, STOREY_HEIGHT_M, touchingNeighbours } from './model'
import { type Candidate, hasDirectEvidence, isGeocodedBuilding, type MatchEvidence, rankCandidates, type Ranking } from './sift'
import { loadOverpassBuildings, loadTileBuildings, type MapBuilding, reversePhoton, searchPhoton } from './sources'

/** Buildings this close to the address are loaded as neighbours (party walls, noise distances). */
const NEIGHBOURHOOD_RADIUS_M = 80
/** Hard gates: a candidate lies this close to the address point and is not shed-sized. */
const CANDIDATE_RADIUS_M = 40
const MIN_CANDIDATE_AREA_M2 = 15
const MAX_CANDIDATES = 10
const REVERSE_CHECKED_CANDIDATES = 3
/**
 * Stop rule: the winner is the OSM building the geocoder matched for the address, or it has direct
 * evidence and wins head-to-head with at least this probability.
 */
export const TARGET_CONFIDENCE = 0.8
const TIME_BUDGET_MS = 12_000

/**
 * Optional sources. Prior P = 0.4 novelty + 0.4 verifiability + 0.2 (1 - redundancy), from tunable
 * judgements. AB-MCTS assumes equal cost per expansion; these sources differ about 100-fold in
 * latency (measured 2026-10-24: Photon 0.1-0.2 s, Overpass 13-35 s or no answer), so the UCB is
 * divided by the expected seconds, as in budgeted bandits.
 */
const ARMS = [
  { name: 'Photon', kind: 'wider', novelty: 1, verifiability: 0.7, redundancy: 0.6, expectedSeconds: 0.3 },
  { name: 'Photon reverse', kind: 'deeper', novelty: 0.7, verifiability: 0.8, redundancy: 0.4, expectedSeconds: 0.5 },
  { name: 'Overpass', kind: 'deeper', novelty: 0.5, verifiability: 1, redundancy: 0.3, expectedSeconds: 8 },
] as const
type Arm = (typeof ARMS)[number]

/** Raised when the location has no house number, so no single building can be meant. */
export class AddressNotExactError extends Error {}

/** One step of the search, as shown to the technician. */
export type SearchStep = { step: number; source: string; kind: 'harvest' | 'wider' | 'deeper'; index?: number; confidence?: number; ms: number; outcome: string }

/** The result of a building search. */
export type BuildingSearchResult = {
  place: GeocodedAddress
  origin: LatLon
  osmUrl?: string
  model: BuildingModel
  ranking: Ranking
  /** ``geocoder``: the geocoder returned this OSM building; ``judges``: the stop rule was met; else unsettled. */
  matchedBy: 'geocoder' | 'judges' | 'unsettled'
  alternatives: Point[][]
  trace: SearchStep[]
}

type LocalBuilding = { ring: Point[]; heightM?: number; tags: Record<string, string>; osmUrl?: string }

/** Keep every outline of ``better`` and the outlines of ``base`` that show other buildings. */
const merge = (base: LocalBuilding[], better: LocalBuilding[]) => [...better, ...base.filter(b => !better.some(x => sameOutline(x.ring, b.ring)))]

/** Neighbours without any height are drawn with two storeys; their height is for display only. */
const neighbourHeight = ({ heightM, tags }: LocalBuilding) => {
  if (heightM) return heightM
  const height = Number.parseFloat(tags.height ?? '')
  if (height > 0) return height
  const levels = Number.parseFloat(tags['building:levels'] ?? '')
  return (levels > 0 ? levels : 2) * STOREY_HEIGHT_M
}

const selectCandidates = (buildings: LocalBuilding[], reference: Point): Candidate[] =>
  buildings
    .map(building => ({ building, distance: distanceToFootprint(building.ring, reference) }))
    .filter(({ building, distance }) => distance <= CANDIDATE_RADIUS_M && signedArea(building.ring) >= MIN_CANDIDATE_AREA_M2)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_CANDIDATES)
    .map(({ building }, i) => ({
      id: building.osmUrl ? building.osmUrl.replace('https://www.openstreetmap.org/', '') : `outline-${i + 1}`,
      ring: building.ring,
      touchingNeighbours: touchingNeighbours(building.ring, buildings.filter(other => other !== building).map(other => other.ring)),
      tags: building.tags,
      osmUrl: building.osmUrl,
    }))

const ucbPerSecond = (arm: Arm, steps: number, qualities: number[]) => {
  const mean = qualities.reduce((sum, q) => sum + q, 0) / qualities.length
  const variance = qualities.reduce((sum, q) => sum + (q - mean) ** 2, 0) / qualities.length
  const c = 1.414 * (1 + 1.5 * variance) * Math.exp((-0.5 * steps) / (ARMS.length + 2))
  const prior = 0.4 * arm.novelty + 0.4 * arm.verifiability + 0.2 * (1 - arm.redundancy)
  // Each source runs once, so Q(s) = N(s) = 0 for the open arms: UCB = c P sqrt(N_parent).
  return (c * prior * Math.sqrt(steps)) / arm.expectedSeconds
}

/**
 * Find the homeowner's building and build its model from live OpenStreetMap data.
 *
 * :param query: The exact address as the homeowner typed it.
 * :param answers: Heated area (storey count when OSM has none) and building type (one judge).
 * :returns: The building model, the SIFT ranking and the AB-MCTS trace.
 * :raises Error: When the address has no house number or no outline lies near it.
 */
export const searchBuilding = async (
  query: string,
  answers: Pick<BuildingInput, 'heatedFloorAreaM2' | 'buildingType'>,
): Promise<BuildingSearchResult> => {
  const started = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIME_BUDGET_MS)
  const trace: SearchStep[] = []
  const record = (source: string, kind: SearchStep['kind'], began: number, outcome: string, extra: Partial<SearchStep> = {}) =>
    trace.push({ step: trace.length + 1, source, kind, ms: Date.now() - began, outcome, ...extra })

  try {
    let began = Date.now()
    const matches = await geocodeAddress(query)
    const best = matches.find(match => match.houseNumber)
    if (!best) throw new AddressNotExactError('No exact address found. Enter street, house number and town to build the 3D model.')
    record('Nominatim', 'harvest', began, `${matches.length} match(es); best: ${best.label}`)

    const project = localProjection(best.coordinates)
    const toLocal = (building: MapBuilding): LocalBuilding => ({ ...building, ring: normaliseRing(building.outline.map(project)) })
    const reference = { x: 0, y: 0 }
    const evidence: MatchEvidence = {
      reference,
      nominatim: matches.map(match => ({ point: project(match.coordinates), matchedBuilding: match.matchedBuilding, houseNumber: match.houseNumber, osmUrl: match.osmUrl })),
      overpassLoaded: false,
      houseNumber: best.houseNumber,
      street: best.street,
      buildingType: answers.buildingType,
    }

    began = Date.now()
    const tiles = (await loadTileBuildings(best.coordinates, NEIGHBOURHOOD_RADIUS_M, controller.signal))
      .map(toLocal)
      .filter(building => building.ring.length >= 3 && distanceToFootprint(building.ring, reference) <= NEIGHBOURHOOD_RADIUS_M)
    let buildings = merge(tiles, matches.filter(match => match.buildingOutline).map(match => toLocal({ outline: match.buildingOutline!, tags: match.tags, osmUrl: match.osmUrl })))
    let ranking = rankCandidates(selectCandidates(buildings, reference), evidence)
    if (!ranking.ranked.length) throw new Error('No building outline found at this address in OpenStreetMap.')
    record('OpenFreeMap tiles', 'harvest', began, `${buildings.length} outlines within ${NEIGHBOURHOOD_RADIUS_M} m; ${ranking.ranked.length} candidates`, { confidence: ranking.confidence })

    const settled = () => {
      const winner = ranking.ranked[0].candidate
      return isGeocodedBuilding(winner, evidence) || ((ranking.confidence ?? 1) >= TARGET_CONFIDENCE && hasDirectEvidence(winner, evidence))
    }
    const run = async (arm: Arm) => {
      if (arm.name === 'Photon') {
        const found = await searchPhoton(query, controller.signal)
        evidence.photon = found.map(match => ({ point: project(match.position), matchedBuilding: match.matchedBuilding, houseNumber: match.houseNumber, osmUrl: match.osmUrl }))
        return `${found.length} match(es)`
      }
      if (arm.name === 'Photon reverse') {
        const checked = ranking.ranked.slice(0, REVERSE_CHECKED_CANDIDATES).map(entry => entry.candidate)
        const nearest = await Promise.all(checked.map(candidate => reversePhoton(toLatLon(best.coordinates, centroid(candidate.ring)), controller.signal)))
        evidence.nearestAddress = checked.map((candidate, i) => ({ ring: candidate.ring, address: nearest[i] }))
        return checked.map((candidate, i) => `${candidate.id} → ${[nearest[i]?.street, nearest[i]?.houseNumber].filter(Boolean).join(' ') || 'none'}`).join('; ')
      }
      const tagged = (await loadOverpassBuildings(best.coordinates, NEIGHBOURHOOD_RADIUS_M, controller.signal)).map(toLocal)
      buildings = merge(buildings, tagged)
      evidence.overpassLoaded = true
      return `${tagged.length} outlines with OSM tags`
    }

    const remaining: Arm[] = [...ARMS]
    const qualities = [ranking.confidence ?? 1]
    while (remaining.length && !settled() && Date.now() - started < TIME_BUDGET_MS) {
      const scored = remaining.map(arm => ({ arm, index: ucbPerSecond(arm, trace.length, qualities) }))
      const { arm, index } = scored.reduce((top, next) => (next.index > top.index ? next : top))
      remaining.splice(remaining.indexOf(arm), 1)
      began = Date.now()
      try {
        const outcome = await run(arm)
        ranking = rankCandidates(selectCandidates(buildings, reference), evidence)
        qualities.push(ranking.confidence ?? 1)
        record(arm.name, arm.kind, began, outcome, { index, confidence: ranking.confidence })
      } catch (error) {
        record(arm.name, arm.kind, began, `no answer (${error instanceof Error ? error.message : 'error'})`, { index })
      }
    }

    const target = ranking.ranked[0].candidate
    const neighbours = buildings
      .filter(building => !sameOutline(building.ring, target.ring))
      .map(building => ({ ring: building.ring, heightM: neighbourHeight(building) }))
    const matchedBy = isGeocodedBuilding(target, evidence) ? 'geocoder' : settled() ? 'judges' : 'unsettled'
    return {
      place: best,
      origin: best.coordinates,
      osmUrl: target.osmUrl,
      model: buildModel(target.ring, neighbours, target.tags, answers.heatedFloorAreaM2, buildings.find(building => building.ring === target.ring)?.heightM),
      ranking,
      matchedBy,
      alternatives: matchedBy === 'unsettled' ? ranking.ranked.slice(1, 3).map(entry => entry.candidate.ring) : [],
      trace,
    }
  } finally {
    clearTimeout(timer)
  }
}
