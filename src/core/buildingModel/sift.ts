/**
 * SIFT ranking of the building outlines that may belong to an address.
 *
 * Independent judges compare candidates in pairs. Each judge looks at one kind of evidence and
 * votes for one candidate or abstains. A Bradley-Terry fit of the win matrix ranks the
 * candidates. The match confidence is the Laplace-smoothed head-to-head record of the top two:
 * 0.8 means at least three judges prefer the winner over the runner-up and none prefers the runner-up.
 */

import type { BuildingInput } from '../types'
import { distanceToFootprint, type Point, sameOutline } from './geometry'
import type { NearestAddress } from './sources'

/** A building outline that may be the homeowner's building. */
export type Candidate = { id: string; ring: Point[]; touchingNeighbours: number; tags: Record<string, string>; osmUrl?: string }

/** A geocoder match in local metres. */
export type GeocoderPoint = { point: Point; matchedBuilding: boolean; houseNumber?: string; osmUrl: string }

/** What the judges know about the address. */
export type MatchEvidence = {
  reference: Point
  nominatim: GeocoderPoint[]
  photon?: GeocoderPoint[]
  /** Nearest address to the centre of each checked outline (Photon reverse search). */
  nearestAddress?: { ring: Point[]; address?: NearestAddress }[]
  overpassLoaded: boolean
  houseNumber?: string
  street?: string
  buildingType?: BuildingInput['buildingType']
}

/** One judge vote in one pairwise comparison. */
export type Vote = { comparison: string; judge: string; winner: string; justification: string }

/** Candidates ordered by Bradley-Terry strength. */
export type Ranking = { ranked: { candidate: Candidate; strength: number }[]; confidence?: number; votes: Vote[]; iterations: number }

/** Votes closer than this distance difference say nothing about which outline is meant. */
const DISTANCE_RESOLUTION_M = 2
/** Address and entrance nodes sit on the wall line; map outlines are accurate to about a metre. */
const ON_BUILDING_M = 1

const sameHouseNumber = (a?: string, b?: string) =>
  a !== undefined && b !== undefined && a.replace(/\s/g, '').toLowerCase() === b.replace(/\s/g, '').toLowerCase()

const supportedBy = (points: GeocoderPoint[], candidate: Candidate, houseNumber?: string) =>
  points.some(match =>
    (match.matchedBuilding || sameHouseNumber(match.houseNumber, houseNumber)) &&
    (match.osmUrl === candidate.osmUrl || distanceToFootprint(candidate.ring, match.point) <= ON_BUILDING_M))

/** Photon reads the same OSM data; a match on the same OSM object as Nominatim is not a second opinion. */
const independentPhoton = (evidence: MatchEvidence) =>
  (evidence.photon ?? []).filter(match => !evidence.nominatim.some(other => other.osmUrl === match.osmUrl))

const isTheAddress = (address: NearestAddress, evidence: MatchEvidence) =>
  sameHouseNumber(address.houseNumber, evidence.houseNumber) && (!evidence.street || !address.street || address.street === evidence.street)

const addressTagsMatch = (candidate: Candidate, evidence: MatchEvidence) =>
  isTheAddress({ street: candidate.tags['addr:street'], houseNumber: candidate.tags['addr:housenumber'] }, evidence)

/** ``undefined`` when the candidate was not checked, so the judge abstains. */
const nearestIsTheAddress = (candidate: Candidate, evidence: MatchEvidence) => {
  const checked = evidence.nearestAddress?.find(entry => sameOutline(entry.ring, candidate.ring))
  if (!checked) return undefined
  return checked.address !== undefined && isTheAddress(checked.address, evidence)
}

const fitsBuildingType = (candidate: Candidate, type?: BuildingInput['buildingType']) => {
  if (type === 'single_two_family') return candidate.touchingNeighbours === 0
  if (type === 'semi_detached' || type === 'end_terrace') return candidate.touchingNeighbours === 1
  if (type === 'mid_terrace') return candidate.touchingNeighbours >= 2
  return undefined
}

/**
 * Tell whether a geocoder matched this exact OSM building for the address (identity, not proximity).
 *
 * :param candidate: Building outline.
 * :param evidence: Evidence about the address.
 * :returns: ``true`` when Nominatim or Photon returned this OSM building with the house number.
 */
export const isGeocodedBuilding = (candidate: Candidate, evidence: MatchEvidence) =>
  candidate.osmUrl !== undefined && [...evidence.nominatim, ...(evidence.photon ?? [])].some(match =>
    match.matchedBuilding && match.osmUrl === candidate.osmUrl && sameHouseNumber(match.houseNumber, evidence.houseNumber))

/**
 * Tell whether a candidate has direct evidence: a geocoder or OSM address match on it.
 *
 * :param candidate: Building outline.
 * :param evidence: Evidence about the address.
 * :returns: ``true`` when a source ties the address to this outline.
 */
export const hasDirectEvidence = (candidate: Candidate, evidence: MatchEvidence) =>
  supportedBy(evidence.nominatim, candidate, evidence.houseNumber) ||
  supportedBy(independentPhoton(evidence), candidate, evidence.houseNumber) ||
  nearestIsTheAddress(candidate, evidence) === true ||
  (evidence.overpassLoaded && addressTagsMatch(candidate, evidence))

type Verdict = { winner: Candidate; justification: string } | undefined
type Judge = { name: string; compare: (a: Candidate, b: Candidate, evidence: MatchEvidence) => Verdict }

const propertyJudge = (
  name: string,
  has: (candidate: Candidate, evidence: MatchEvidence) => boolean | undefined,
  justification: string,
): Judge => ({
  name,
  compare: (a, b, evidence) => {
    const hasA = has(a, evidence)
    const hasB = has(b, evidence)
    if (hasA === undefined || hasB === undefined || hasA === hasB) return undefined
    return { winner: hasA ? a : b, justification }
  },
})

const JUDGES: Judge[] = [
  propertyJudge('nominatim', (c, e) => supportedBy(e.nominatim, c, e.houseNumber), 'contains the Nominatim match for the address'),
  propertyJudge('photon', (c, e) => {
    const matches = independentPhoton(e)
    return matches.length ? supportedBy(matches, c, e.houseNumber) : undefined
  }, 'contains a Photon match on another OSM object'),
  propertyJudge('reverse geocoding', nearestIsTheAddress, 'the nearest address to its centre is this address'),
  propertyJudge('overpass', (c, e) => (e.overpassLoaded ? addressTagsMatch(c, e) : undefined), 'its OSM address tags name this house number'),
  propertyJudge('building type', (c, e) => fitsBuildingType(c, e.buildingType), 'its shared walls fit the selected building type'),
  {
    name: 'distance',
    compare: (a, b, evidence) => {
      const da = distanceToFootprint(a.ring, evidence.reference)
      const db = distanceToFootprint(b.ring, evidence.reference)
      if (Math.abs(da - db) <= DISTANCE_RESOLUTION_M) return undefined
      return { winner: da < db ? a : b, justification: `${da.toFixed(1)} m vs ${db.toFixed(1)} m from the address point` }
    },
  },
]

/**
 * Fit Bradley-Terry strengths to a win matrix.
 *
 * :param wins: ``wins[i][j]`` counts the votes for candidate i over candidate j.
 * :param smoothing: Laplace smoothing added to every off-diagonal entry.
 * :returns: Strengths that sum to the number of candidates, and the iterations used.
 */
export const bradleyTerry = (wins: number[][], smoothing = 1) => {
  const k = wins.length
  if (k < 2) return { strengths: wins.map(() => 1), iterations: 0 }
  const w = wins.map((row, i) => row.map((value, j) => (i === j ? 0 : value + smoothing)))
  let theta: number[] = Array(k).fill(1)
  for (let iteration = 1; iteration <= 1000; iteration++) {
    const next = theta.map((ti, i) => {
      let won = 0
      let played = 0
      for (let j = 0; j < k; j++) {
        if (j === i) continue
        won += w[i][j]
        played += (w[i][j] + w[j][i]) / (ti + theta[j])
      }
      return won / played
    })
    const scale = k / next.reduce((sum, t) => sum + t, 0)
    const normalised = next.map(t => t * scale)
    const change = Math.max(...normalised.map((t, i) => Math.abs(t - theta[i])))
    theta = normalised
    if (change < 1e-9) return { strengths: theta, iterations: iteration }
  }
  return { strengths: theta, iterations: 1000 }
}

/**
 * Rank building candidates with all judges and a Bradley-Terry fit.
 *
 * :param candidates: Outlines near the address, at least one.
 * :param evidence: Evidence about the address.
 * :returns: Ranked candidates, the votes behind them and the match confidence.
 */
export const rankCandidates = (candidates: Candidate[], evidence: MatchEvidence): Ranking => {
  const wins = candidates.map(() => candidates.map(() => 0))
  const votes: Vote[] = []
  candidates.forEach((a, i) => candidates.slice(i + 1).forEach((b, offset) => {
    const j = i + 1 + offset
    for (const judge of JUDGES) {
      const verdict = judge.compare(a, b, evidence)
      if (!verdict) continue
      if (verdict.winner === a) wins[i][j]++
      else wins[j][i]++
      votes.push({ comparison: `${a.id}_vs_${b.id}`, judge: judge.name, winner: verdict.winner.id, justification: verdict.justification })
    }
  }))
  const { strengths, iterations } = bradleyTerry(wins)
  const order = candidates.map((_, i) => i).sort((a, b) => strengths[b] - strengths[a])
  const [first, second] = order
  // Laplace-smoothed head-to-head record of the top two: a fit over all candidates would be
  // pulled towards 0.5 by the smoothing of pairs that no judge could tell apart.
  const confidence = second === undefined ? undefined : (wins[first][second] + 1) / (wins[first][second] + wins[second][first] + 2)
  return { ranked: order.map(i => ({ candidate: candidates[i], strength: strengths[i] })), confidence, votes, iterations }
}
