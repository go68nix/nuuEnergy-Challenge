import type { AssessmentModule, BuildingInput } from '../types'
import { estimatePipeSystemFromBuildingYear } from '../questionnaireState'
import { getPipeYearMismatchItem, getUnclearPhotoItem } from '../reportChecks'
import { makeReportItem } from '../reportItems'

export type PipeTypeData = { pipe_system: 'two-pipe' | 'single-pipe' | 'unknown'; riskLevel: 'low' | 'medium' | 'high'; source: 'user' | 'estimated' | 'unknown'; confirmed: boolean; basis: string; confidence?: number; evidence?: string[] }

export const assessPipeType = (building: BuildingInput): PipeTypeData => {
  const estimate = estimatePipeSystemFromBuildingYear(building.constructionOrRenovationYear)
  const source = building.pipeSystemSource ?? 'unknown'
  const system = building.pipe_system ?? 'unknown'
  return {
    pipe_system: system,
    riskLevel: source === 'user' || source === 'estimated' ? (system === 'single-pipe' ? 'high' : system === 'two-pipe' ? 'low' : estimate.riskLevel) : estimate.riskLevel,
    source,
    confirmed: source === 'user' && system !== 'unknown',
    basis: source === 'user' ? 'Selected by the homeowner.' : source === 'estimated' ? 'Likely classification from the heater photo; verify on site.' : estimate.basis,
    confidence: building.pipeSystemConfidence,
    evidence: building.pipeSystemEvidence,
  }
}

export const pipeTypeModule: AssessmentModule = {
  id: 'pipe_type',
  label: 'Heating pipe system',
  run(building, context) {
    const source = building.pipeSystemSource ?? 'unknown'
    const system = building.pipe_system ?? 'unknown'
    const reportItems = [
      ...(!building.pipe_system || system === 'unknown' || source === 'unknown' ? [makeReportItem('pipe.missing', 'missing')] : []),
      ...(source === 'estimated' ? [makeReportItem('pipe.estimate', 'uncertain'), makeReportItem('pipe.verify', 'verify', 'high')] : []),
      ...(source === 'user' && system === 'single-pipe' ? [makeReportItem('pipe.verify', 'verify', 'high')] : []),
      getPipeYearMismatchItem(building),
      getUnclearPhotoItem(context.photos),
    ].filter((item): item is NonNullable<typeof item> => item !== undefined)
    return {
      id: 'pipe_type',
      label: 'Heating pipe system',
      status: source === 'user' ? 'ok' : 'warning',
      data: assessPipeType(building),
      notes: system === 'unknown' ? [source === 'estimated' ? 'Heating pipe system unclear from the photos. A technician should check whether this is a single-pipe system, because that can require a higher flow temperature.' : 'Pipe system unknown. A technician should check whether this is a single-pipe system, because that can require a higher flow temperature.'] : undefined,
      reportItems,
    }
  },
}
