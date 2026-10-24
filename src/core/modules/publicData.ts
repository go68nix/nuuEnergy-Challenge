/**
 * Public data enrichment module for the core assessment pipeline.
 *
 * Integrates open cadastre, climate, grid operator, and subsidy information,
 * or provides transparent national defaults when location entry is skipped by the user.
 */

import type { AssessmentModule, BuildingInput, ModuleResult } from '../types'
import { lookupPublicDataSync } from '../publicData/service'

export const publicDataModule: AssessmentModule = {
  id: 'public_data',
  label: 'Public data & regional context',
  run(building: BuildingInput): ModuleResult {
    let pd = building.publicData

    if (!pd && building.location && building.location.trim().length > 0) {
      pd = lookupPublicDataSync(building.location.trim(), building)
      building.publicData = pd
      if (building.designOutdoorTempC === undefined && pd.climate?.designOutdoorTempC !== undefined) {
        building.designOutdoorTempC = pd.climate.designOutdoorTempC
      }
    }

    if (!pd) {
      return {
        id: 'public_data',
        label: 'Public data & regional context',
        status: 'ok',
        data: {
          locationProvided: false,
          referenceOutdoorTempC: -12.0,
          climateSource: 'DIN EN 12831 (National Reference Baseline)',
          dsoStatus: 'Standard §14a EnWG Connection Guarantee applies nationwide.',
          subsidySummary: 'KfW 458: 30% base + up to 16% speed bonus + up to 30% income bonus (max 70%).',
        },
        notes: [
          'Location was skipped. Standard DIN EN 12831 national climate (-12°C) and federal subsidy rules applied.',
        ],
      }
    }

    const notes: string[] = [
      `Location: ${pd.formattedAddress ?? pd.city ?? pd.postalCode ?? 'Germany'}`,
      `DIN EN 12831 Design Outdoor Temperature: ${pd.climate?.designOutdoorTempC ?? -12}°C (${pd.climate?.matchedCity ?? 'Reference'})`,
      `Grid Operator: ${pd.grid?.dsoName ?? 'Responsible DSO'} (§14a EnWG connection guaranteed, reduced grid fee eligible)`,
    ]

    if (pd.subsidies?.regionalProgramName) {
      notes.push(`Regional Subsidy: ${pd.subsidies.regionalProgramName} (+${pd.subsidies.regionalBonusPercent}%)`)
    }

    if (pd.crossChecks && pd.crossChecks.length > 0) {
      for (const cc of pd.crossChecks) {
        if (cc.status === 'divergence') {
          notes.push(`Cross-check note (${cc.field}): ${cc.message}`)
        }
      }
    }

    return {
      id: 'public_data',
      label: 'Public data & regional context',
      status: 'ok',
      data: {
        locationProvided: true,
        query: pd.query,
        formattedAddress: pd.formattedAddress,
        postalCode: pd.postalCode,
        city: pd.city,
        climate: pd.climate,
        grid: pd.grid,
        zensus: pd.zensus,
        subsidies: pd.subsidies,
        crossChecks: pd.crossChecks,
        siftWinner: pd.siftTournament?.winnerLabel,
        siftProbability: pd.siftTournament?.winProbability,
      },
      notes,
    }
  },
}
