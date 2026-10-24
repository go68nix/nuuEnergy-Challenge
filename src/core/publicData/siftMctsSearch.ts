/**
 * Algorithmic SIFT and AB-MCTS search engine for house public data.
 *
 * Implements deterministic candidate filtering via Bradley-Terry pairwise tournaments (SIFT)
 * and heuristic search arbitration (AB-MCTS) without requiring external LLM API calls.
 */

import type {
  AbMctsBranchResult,
  QueryType,
  SiftCandidateScore,
  SiftTournamentResult,
} from './types'

export type AddressComponents = {
  postalCode?: string
  city?: string
  street?: string
  houseNumber?: string
  queryType: QueryType
  rawQuery: string
}

/**
 * Extract German postal code and address components from free text.
 *
 * :param query: User-supplied address or location string.
 * :returns: Structured AddressComponents object.
 */
export const parseLocationInput = (query: string): AddressComponents => {
  const trimmed = query.trim()
  if (!trimmed) {
    return { queryType: 'unknown', rawQuery: query }
  }

  // German 5-digit postal code match
  const plzMatch = trimmed.match(/\b([0-9]{5})\b/)
  const postalCode = plzMatch ? plzMatch[1] : undefined

  // Street name and house number heuristic (e.g. "Sendlinger Str. 12" or "Musterstraße 5a")
  const streetMatch = trimmed.match(/([a-zA-ZäöüÄÖÜß.\s-]+?)\s+(\d+[a-zA-Z]?)\b/)
  const street = streetMatch ? streetMatch[1].trim() : undefined
  const houseNumber = streetMatch ? streetMatch[2].trim() : undefined

  // City heuristic: if PLZ is followed by word, extract city
  let city: string | undefined
  if (postalCode) {
    const afterPlz = trimmed.slice(trimmed.indexOf(postalCode) + 5).replace(/^[,.\s]+/, '')
    const cityMatch = afterPlz.match(/^([a-zA-ZäöüÄÖÜß\s-]+)/)
    if (cityMatch && cityMatch[1].trim()) {
      city = cityMatch[1].trim()
    }
  }

  const queryType: QueryType = (street && houseNumber) || (postalCode && street)
    ? 'address'
    : postalCode
      ? 'plz'
      : 'unknown'

  return {
    postalCode,
    city,
    street,
    houseNumber,
    queryType,
    rawQuery: query,
  }
}

/**
 * Compute Dice coefficient string similarity between two lowercase strings.
 *
 * :param a: First string.
 * :param b: Second string.
 * :returns: Similarity score between 0.0 and 1.0.
 */
export const stringSimilarity = (a: string, b: string): number => {
  const normA = a.toLowerCase().replace(/[^a-z0-9]/g, '')
  const normB = b.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!normA || !normB) return 0
  if (normA === normB) return 1

  const bigramsA = new Set<string>()
  for (let i = 0; i < normA.length - 1; i++) {
    bigramsA.add(normA.slice(i, i + 2))
  }
  let matches = 0
  for (let i = 0; i < normB.length - 1; i++) {
    if (bigramsA.has(normB.slice(i, i + 2))) {
      matches++
    }
  }
  return (2 * matches) / (normA.length + normB.length - 2 || 1)
}

export type RawCandidate = {
  id: string
  label: string
  postalCode?: string
  houseNumber?: string
  street?: string
  footprintM2?: number
}

/**
 * Execute a SIFT tournament over candidate public data building matches.
 *
 * Evaluates candidates using multi-criteria weighted scoring and computes
 * head-to-head Bradley-Terry preference probabilities.
 *
 * :param query: Address components parsed from user query.
 * :param candidates: Array of candidate matches from geocoding or spatial fallback.
 * :returns: SiftTournamentResult containing top candidate rankings and win probability.
 */
export const runSiftTournament = (
  query: AddressComponents,
  candidates: RawCandidate[],
): SiftTournamentResult => {
  if (candidates.length === 0) {
    return {
      candidatesConsidered: 0,
      topCandidates: [],
      winnerLabel: 'None',
      winProbability: 0,
    }
  }

  const scored: SiftCandidateScore[] = candidates.map((c) => {
    const sim = query.street && c.street ? stringSimilarity(query.street, c.street) : 0.5
    const plzMatch = Boolean(query.postalCode && c.postalCode === query.postalCode)
    const numMatch = Boolean(query.houseNumber && c.houseNumber === query.houseNumber)
    const footprintPlausible = (c.footprintM2 ?? 0) >= 40 && (c.footprintM2 ?? 0) <= 800

    const score =
      (plzMatch ? 0.35 : 0.05) +
      (numMatch ? 0.30 : query.houseNumber ? 0.0 : 0.15) +
      sim * 0.25 +
      (footprintPlausible ? 0.10 : 0.02)

    return {
      candidateId: c.id,
      label: c.label,
      addressSimilarity: Math.round(sim * 100) / 100,
      plzMatch,
      houseNumberMatch: numMatch,
      footprintPlausible,
      score: Math.round(score * 1000) / 1000,
    }
  })

  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]
  const secondBest = scored[1]

  // Bradley-Terry probability P(best > secondBest) = 1 / (1 + exp(-(score_best - score_second) / 0.2))
  const delta = secondBest ? best.score - secondBest.score : 0.5
  const winProbability = Math.round((1 / (1 + Math.exp(-delta / 0.2))) * 100) / 100

  return {
    candidatesConsidered: candidates.length,
    topCandidates: scored.slice(0, 3),
    winnerLabel: best.label,
    winProbability,
  }
}

export type BranchTask = {
  name: string
  depth: number
  priorWeight: number
  execute: () => { success: boolean; evidenceQuality: number }
}

/**
 * Execute AB-MCTS heuristic arbitration across public data branches.
 *
 * Directs information gathering using Upper Confidence Bound (UCB1) scoring
 * to balance exploitation of high-value sources with exploration of secondary priors.
 *
 * :param tasks: Array of branch tasks to arbitrate.
 * :returns: Array of AbMctsBranchResult tracking search depth and UCB scores.
 */
export const runAbMctsArbitration = (tasks: BranchTask[]): AbMctsBranchResult[] => {
  const c0 = 1.414
  let totalVisits = 0
  const results: AbMctsBranchResult[] = tasks.map((t) => ({
    branchName: t.name,
    depth: t.depth,
    visits: 1,
    qValue: t.priorWeight,
    ucbScore: t.priorWeight,
    selected: false,
  }))
  totalVisits = results.length

  // Run iterative allocation passes
  for (let pass = 0; pass < tasks.length; pass++) {
    for (const r of results) {
      r.ucbScore = r.qValue + c0 * Math.sqrt(Math.log(totalVisits + 1) / (r.visits + 1))
    }

    // Select best unexecuted or highest UCB branch
    results.sort((a, b) => b.ucbScore - a.ucbScore)
    const candidate = results.find((r) => !r.selected) ?? results[0]
    const task = tasks.find((t) => t.name === candidate.branchName)

    if (task) {
      const outcome = task.execute()
      candidate.visits++
      totalVisits++
      candidate.qValue = outcome.success
        ? (candidate.qValue * (candidate.visits - 1) + outcome.evidenceQuality) / candidate.visits
        : candidate.qValue * 0.7
      candidate.selected = true
    }
  }

  return results
}
