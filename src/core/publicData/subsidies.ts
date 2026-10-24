/**
 * Subsidy calculation engine for German heat pump retrofits.
 *
 * Computes federal KfW 458 grants (base, climate speed, income bonuses) and
 * integrates municipal top-up programs (such as Munich FKG and Hamburg IFB).
 */

import type { SubsidyInfo } from './types'

export type SubsidyInput = {
  rawPlz?: string | number
  heatingSystem?: string
  heatingSystemAge?: string
  taxableIncomeUnder40k?: boolean
}

/**
 * Calculate available federal and municipal heat pump subsidies.
 *
 * :param input: Parameters including postal code, current heating type, and age.
 * :returns: SubsidyInfo containing percentage breakdown, maximum euro caps, and regional bonuses.
 */
export const calculateSubsidies = (input: SubsidyInput = {}): SubsidyInfo => {
  const basePercent = 30
  const maxEligibleCostEur = 30000

  // Speed bonus (16% in 2026): applies if replacing an oil heating or gas heating >= 20 years old
  const isOil = input.heatingSystem === 'oil' || input.heatingSystem === 'oil_condensing'
  const isGas = input.heatingSystem === 'gas' || input.heatingSystem === 'gas_condensing'
  const isOldHeating = input.heatingSystemAge === '20_29' || input.heatingSystemAge === '30_plus'
  const qualifiesForSpeedBonus = isOil || (isGas && isOldHeating)
  const speedBonusPercent = qualifiesForSpeedBonus ? 16 : 0

  // Income bonus: 30% if taxable income is <= 40,000 EUR
  const incomeBonusMaxPercent = input.taxableIncomeUnder40k ? 30 : 0

  const cleaned = String(input.rawPlz ?? '').trim().replace(/\D/g, '')
  const prefix = cleaned.slice(0, 2)

  let regionalProgramName: string | undefined
  let regionalBonusPercent: number | undefined
  let maxRegionalGrantEur: number | undefined
  const notes: string[] = [
    `KfW 458 base grant: ${basePercent}% for owner-occupiers.`,
  ]

  if (speedBonusPercent > 0) {
    notes.push('KfW 458 speed bonus: +16% for replacing existing fossil heating.')
  } else {
    notes.push('KfW 458 speed bonus (+16%) available if replacing oil heating or a gas system >= 20 years old.')
  }

  notes.push('KfW 458 income bonus: +30% available for households with taxable income <= 40,000 EUR (capped at 70% overall).')

  // Municipal top-ups
  if (prefix === '80' || prefix === '81') {
    regionalProgramName = 'Münchner Förderprogramm Klimaneutrale Gebäude (FKG)'
    regionalBonusPercent = 15
    maxRegionalGrantEur = 4500
    notes.push('Munich FKG top-up: Up to +15% additional municipal grant (total funding capped at 60%). Must be applied for before contract award.')
  } else if (prefix === '20' || prefix === '21' || prefix === '22') {
    regionalProgramName = 'Hamburg IFB Förderprogramm Wärmepumpen'
    regionalBonusPercent = 20
    maxRegionalGrantEur = 9000
    notes.push('Hamburg IFB grant: Up to +20% (max 9,000 EUR) municipal funding available.')
  }

  return {
    federalBasePercent: basePercent,
    speedBonusPercent,
    incomeBonusMaxPercent,
    maxEligibleCostEur,
    regionalProgramName,
    regionalBonusPercent,
    maxRegionalGrantEur,
    notes,
  }
}
