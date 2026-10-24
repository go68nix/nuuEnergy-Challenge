import type { AssessmentResult, BuildingInput, ReportItem } from '../core/types'
import { buildReport } from '../core/report'

type Source = 'provided' | 'estimated' | 'unknown'
const source = (value: unknown): Source => value === undefined || value === null || value === '' || value === 'unknown' ? 'unknown' : 'provided'
const compactValue = (value: unknown) => Array.isArray(value) ? value : value && typeof value === 'object' ? value : value

const questionnaire = (building: BuildingInput) => Object.fromEntries(
  Object.entries(building)
    .filter(([key]) => !key.toLowerCase().includes('photo') && key !== 'pipeSystemEvidence')
    .map(([key, value]) => [key, { value: compactValue(value), source: key === 'pipeSystemSource' && value === 'estimated' ? 'estimated' : source(value) }]),
)

export type ChatContext = {
  questionnaire: Record<string, { value: unknown; source: Source }>
  verdict: { level: string; reasons: string[] }
  modules: Array<{ id: string; label: string; status: string; data?: unknown; confidence: Source }>
  checks: { missing: string[]; uncertain: string[]; verify: string[] }
}

export const buildChatContext = (assessment: AssessmentResult | null): ChatContext => {
  if (!assessment) return { questionnaire: {}, verdict: { level: 'unknown', reasons: [] }, modules: [], checks: { missing: [], uncertain: [], verify: [] } }
  const report = buildReport(assessment.building, assessment, 'en')
  const items = assessment.modules.flatMap(module => module.reportItems ?? [])
  const localize = (item: ReportItem) => item.text
  return {
    questionnaire: questionnaire(assessment.building),
    verdict: { level: report.summary.level, reasons: report.summary.reasons },
    modules: assessment.modules.map(module => ({ id: module.id, label: module.label, status: module.status, data: module.data, confidence: module.id === 'pipe_type' ? (module.data as { source?: Source } | undefined)?.source ?? 'unknown' : module.status === 'not_implemented' ? 'unknown' : 'estimated' })),
    checks: {
      missing: items.filter(item => item.kind === 'missing').map(localize),
      uncertain: items.filter(item => item.kind === 'uncertain').map(localize),
      verify: items.filter(item => item.kind === 'verify').map(localize),
    },
  }
}
