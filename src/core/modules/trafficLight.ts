/**
 * Traffic light decision module implementing nuuEnergy's customer-first business rule.
 *
 * Evaluates overall heat pump feasibility, strictly reserving verdicts to Green
 * (directly ready) or Yellow (suitable with tailored on-site planning).
 * In alignment with company policy, Red is never shown; an encouraging consultative
 * next step with nuuEnergy master installers is always presented.
 */

import type { AssessmentModule, BuildingInput, TrafficLight } from '../types'
import { getEnergyIntensity, REPORT_CHECK_CONFIG } from '../reportChecks'
import { assessRadiators } from './radiators'
import { assessPipeType } from './pipeType'
import { REPORT_LOCALES } from '../reportLocales'

export type TrafficLightData = {
  verdict: TrafficLight
  color: 'green' | 'yellow'
  title: string
  badge: string
  summary: string
  reasons: string[]
  onSiteChecklist: string[]
  ctaText: string
  contactHotline: string
}

/**
 * Evaluate building inputs to produce a customer-friendly suitability verdict.
 *
 * :param building: Aggregated homeowner questionnaire data.
 * :returns: TrafficLightData with green or yellow verdict and actionable consultation steps.
 */
export const evaluateTrafficLight = (building: BuildingInput): TrafficLightData => {
  const radiatorInfo = assessRadiators(building)
  const pipeInfo = assessPipeType(building)
  // The report screening (pipe source, energy plausibility) feeds the same verdict,
  // so the result page, the technician report and the chat never disagree.
  const screening = assessTrafficLight(building)

  const hasSinglePipe = pipeInfo.pipe_system === 'single-pipe'
  const isPipeUnclear =
    (pipeInfo.pipe_system === 'unknown' && building.constructionOrRenovationYear < 1990) ||
    screening.reasonKeys.includes('summary.estimatedPipe')
  const hasHighFlowTemp = radiatorInfo.flowTemperatureClass === 'high'
  const isPre1980Uninsulated =
    building.constructionOrRenovationYear < 1980 &&
    !building.facadeInsulated &&
    !building.roofInsulated

  // Company Policy: If any challenging factor exists, classify as Yellow with tailored consultation.
  // Never classify as Red!
  const requiresTailoredPlanning =
    hasSinglePipe || isPipeUnclear || hasHighFlowTemp || isPre1980Uninsulated || screening.level !== 'green'

  if (!requiresTailoredPlanning) {
    return {
      verdict: 'green',
      color: 'green',
      title: 'Your home is Heat Pump Ready!',
      badge: 'Directly Suitable · Heat Pump Ready',
      summary:
        'Your building fabric, heating distribution, and pipework are in great shape for a direct heat pump installation with high efficiency.',
      reasons: [
        radiatorInfo.heatingDistribution === 'underfloor'
          ? 'Underfloor heating operates at low flow temperatures (30–35°C), maximizing seasonal performance.'
          : `Estimated radiator flow temperature (~${radiatorInfo.estimatedFlowTempC}°C) is well within efficient heat pump range (<= 55°C).`,
        pipeInfo.pipe_system === 'two-pipe'
          ? 'Standard two-pipe system allows straightforward hydraulic balancing.'
          : 'Two-pipe heating configuration confirmed or highly probable from building age.',
        'German grid operator (§14a EnWG) guarantee applies: Connection is legally assured with discounted grid fees.',
      ],
      onSiteChecklist: [
        'Fine-tuned DIN EN 12831 room-by-room heat load calculation',
        'Hydraulic balancing (hydraulischer Abgleich Verfahren B)',
        'Zählerschrank & electrical service check with DSO for §14a EnWG registration',
        'Outdoor unit sound insulation & siting assessment',
      ],
      ctaText: 'Schedule your free on-site planning with nuuEnergy master installers',
      contactHotline: 'nuuEnergy Expert Hotline: 0800 688 3637',
    }
  }

  // Yellow verdict: Suitable with tailored individual planning
  const yellowReasons: string[] = []
  const yellowChecklist: string[] = [
    'On-site inspection of heating circuit and pipe layout by a master installer',
    'Measurement of radiator surface areas and selection of potential Type 22/33 upgrades',
    'Preparation of custom hydraulic balancing concept',
    'KfW 458 speed bonus and municipal subsidy application assistance',
  ]

  if (hasSinglePipe) {
    yellowReasons.push(
      'Single-pipe heating identified: nuuEnergy installs specially calibrated low-resistance bypass valves and buffer concepts to guarantee full heat pump efficiency.',
    )
    yellowChecklist.unshift('Hydraulic single-pipe circuit analysis and bypass valve check')
  } else if (isPipeUnclear) {
    yellowReasons.push(
      'Heating pipe layout requires brief on-site confirmation by our master installer to verify two-pipe vs. single-pipe connections.',
    )
  }

  if (hasHighFlowTemp) {
    yellowReasons.push(
      `Estimated flow temperature (~${radiatorInfo.estimatedFlowTempC}°C) is above 55°C. Replacing 1–2 radiators with Type 22/33 low-temp convectors reduces operating costs by 15–20%.`,
    )
  }

  if (isPre1980Uninsulated) {
    yellowReasons.push(
      'Built before 1980 without major facade/roof insulation. Modern R290 heat pumps deliver ample heat; phased envelope upgrades can further cut operating costs.',
    )
  }

  return {
    verdict: 'yellow',
    color: 'yellow',
    title: 'Suitable with tailored planning & on-site check',
    badge: 'Individual Planning · 100% Feasible with nuuEnergy',
    summary:
      'A heat pump is fully achievable for your home with individual planning. nuuEnergy specializes in upgrading existing homes with tailored hydraulic balancing and modern heat pump systems.',
    reasons: yellowReasons,
    onSiteChecklist: yellowChecklist,
    ctaText: 'Book your personal on-site planning session with nuuEnergy',
    contactHotline: 'nuuEnergy Expert Hotline: 0800 688 3637',
  }
}

export type PreliminaryTrafficLight = { level: 'green' | 'yellow' | 'red'; reasonKeys: string[] }

export const assessTrafficLight = (building: Parameters<AssessmentModule['run']>[0]): PreliminaryTrafficLight => {
  const intensity = getEnergyIntensity(building)
  if (building.pipeSystemSource === 'user' && building.pipe_system === 'single-pipe') {
    return { level: 'yellow', reasonKeys: ['summary.singlePipe'] }
  }
  if (intensity > REPORT_CHECK_CONFIG.plausibleEnergyUseKwhPerM2[1]) {
    return { level: 'yellow', reasonKeys: ['summary.energy'] }
  }
  if (intensity < REPORT_CHECK_CONFIG.plausibleEnergyUseKwhPerM2[0]) {
    return { level: 'yellow', reasonKeys: ['summary.energy'] }
  }
  if (building.pipeSystemSource !== 'user' || building.pipe_system === 'unknown') {
    return { level: 'yellow', reasonKeys: ['summary.estimatedPipe'] }
  }
  return { level: 'green', reasonKeys: ['summary.complete'] }
}

export const trafficLightModule: AssessmentModule = {
  id: 'traffic_light',
  label: 'Traffic light summary',
  run(building) {
    const data = evaluateTrafficLight(building)
    const preliminary = assessTrafficLight(building)
    return {
      id: 'traffic_light',
      label: 'Traffic light summary',
      status: 'ok',
      headline: REPORT_LOCALES.en.results.verdictHeadline[data.verdict],
      explanation: REPORT_LOCALES.en.results.verdictReason,
      data: {
        ...data,
        level: data.verdict,
        reasonKeys: preliminary.reasonKeys,
      },
      notes: [
        `${data.badge}: ${data.summary}`,
        `Next step: ${data.ctaText}`,
      ],
    }
  },
}
