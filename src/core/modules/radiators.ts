/**
 * Radiator assessment and flow temperature estimation module.
 *
 * Implements the radiator characteristic exponent law (Phi = Phi_50 * (DeltaT / 50)^1.3)
 * from OpenEnergyMonitor and OpenHeatLoss to estimate design flow temperatures and evaluate
 * low-temperature compatibility for heat pump operation.
 */

import type { AssessmentModule, BuildingInput } from '../types'
import { makeReportItem } from '../reportItems'
import { REPORT_LOCALES } from '../reportLocales'

export type RadiatorAssessmentData = {
  heatingDistribution: string
  estimatedFlowTempC: number
  flowTemperatureClass: 'low' | 'medium' | 'high'
  suitability: 'optimal' | 'directly_compatible' | 'upgrade_recommended'
  radiatorExponent: number
  systemDeltaT: number
  recommendedUpgrades: string[]
  basis: string
}

/**
 * Estimate flow temperature and radiator suitability using the 1.3 exponent law.
 *
 * :param building: Homeowner answers on distribution, insulation, and building era.
 * :returns: RadiatorAssessmentData with flow temp, class, and actionable upgrade notes.
 */
export const assessRadiators = (building: BuildingInput): RadiatorAssessmentData => {
  const dist = building.heatingDistribution ?? 'radiator'
  const hasInsulation = Boolean(building.facadeInsulated || building.roofInsulated)
  const isPost2002 = building.constructionOrRenovationYear >= 2002
  const isNewer = building.constructionOrRenovationYear >= 1995

  // Underfloor heating is optimal with low design flow temperature
  if (dist === 'underfloor') {
    return {
      heatingDistribution: 'underfloor',
      estimatedFlowTempC: 35,
      flowTemperatureClass: 'low',
      suitability: 'optimal',
      radiatorExponent: 1.1,
      systemDeltaT: 5,
      recommendedUpgrades: [],
      basis: 'Underfloor heating provides large surface area operating at 30–35°C, yielding optimal heat pump seasonal performance (JAZ ~ 4.0–4.5).',
    }
  }

  // Mixed underfloor and radiators
  if (dist === 'mixed') {
    const flowTemp = hasInsulation || isNewer ? 42 : 48
    return {
      heatingDistribution: 'mixed',
      estimatedFlowTempC: flowTemp,
      flowTemperatureClass: 'medium',
      suitability: 'directly_compatible',
      radiatorExponent: 1.25,
      systemDeltaT: 5,
      recommendedUpgrades: [
        'Check that radiator branch flow temperature matches the low-temp circuit via mixer valve.',
      ],
      basis: 'Combination of underfloor and radiators operates at moderate flow temperature (~42–48°C), directly compatible with modern heat pumps.',
    }
  }

  // Radiators: compute using characteristic exponent 1.3 (OpenEnergyMonitor & OpenHeatLoss model)
  // Original design sizing for German radiators was 75/65/20 (DeltaT_50 = 50 K).
  // If building heat loss has dropped due to insulation or newer build, actual DeltaT is lower:
  // DeltaT_actual = 50 * (loadRatio)^(1 / 1.3)
  let loadRatio = 1.0
  if (building.facadeInsulated && building.roofInsulated || isPost2002) {
    loadRatio = 0.45
  } else if (hasInsulation && isNewer) {
    loadRatio = 0.50
  } else if (hasInsulation || isNewer) {
    loadRatio = 0.55
  } else if (building.constructionOrRenovationYear < 1980) {
    loadRatio = 0.95
  } else {
    loadRatio = 0.82
  }

  const systemDeltaT = 5
  const roomTemp = 20
  const deltaT = 50 * Math.pow(loadRatio, 1 / 1.3)
  const meanWaterTemp = roomTemp + deltaT
  const estimatedFlowTempC = Math.round(meanWaterTemp + systemDeltaT * 0.5)

  if (estimatedFlowTempC <= 50) {
    return {
      heatingDistribution: 'radiator',
      estimatedFlowTempC,
      flowTemperatureClass: 'medium',
      suitability: 'directly_compatible',
      radiatorExponent: 1.3,
      systemDeltaT,
      recommendedUpgrades: [
        'Hydraulic balancing (hydraulischer Abgleich) ensures all radiators receive required flow.',
      ],
      basis: `Envelope insulation or construction standard allows low-to-medium flow temperature (~${estimatedFlowTempC}°C), directly compatible with heat pumps without replacing radiators.`,
    }
  }

  return {
    heatingDistribution: 'radiator',
    estimatedFlowTempC,
    flowTemperatureClass: estimatedFlowTempC <= 55 ? 'medium' : 'high',
    suitability: estimatedFlowTempC <= 55 ? 'directly_compatible' : 'upgrade_recommended',
    radiatorExponent: 1.3,
    systemDeltaT,
    recommendedUpgrades: [
      'Targeted upgrade of 1–2 critical room radiators (e.g. living room) to Type 22 or Type 33 low-temperature radiators.',
      'Execute hydraulic balancing (hydraulischer Abgleich nach Verfahren B) to lower system flow temperature below 55°C.',
    ],
    basis: `Higher estimated flow temperature (~${estimatedFlowTempC}°C). A modern R290 heat pump can provide this heat; upgrading 1–2 radiators lowers flow temp and boosts efficiency by 15–20%.`,
  }
}

export const radiatorsModule: AssessmentModule = {
  id: 'radiators',
  label: 'Radiator assessment',
  run(building) {
    const data = assessRadiators(building)
    const notes: string[] = [data.basis]
    if (data.recommendedUpgrades.length > 0) {
      notes.push(...data.recommendedUpgrades)
    }

    return {
      id: 'radiators',
      label: 'Radiator assessment',
      status: data.suitability === 'upgrade_recommended' ? 'warning' : 'ok',
      headline: REPORT_LOCALES.en.results.cards.flow.headline,
      explanation: REPORT_LOCALES.en.results.cards.flow.explanation,
      data,
      notes,
      reportItems: building.heatingDistribution === undefined ? [makeReportItem('radiators.missing', 'missing')] : [],
    }
  },
}
