import { describe, expect, it } from 'vitest'
import { buildReport, exportReportAsText } from '../src/core/report'
import { runAssessment } from '../src/core/registry'
import type { AssessmentResult, BuildingInput, ReportItem } from '../src/core/types'

const provided: BuildingInput = {
  fuelType:'gas_kwh', annualConsumption:14000, constructionOrRenovationYear:2000, heatedFloorAreaM2:100,
  heatingDistribution:'radiator', buildingType:'single_two_family', heatingSystem:'gas', facadeInsulated:false,
  roofInsulated:true, heatingSystemAge:'10_19', replacementTiming:'over_6_months', winterHeatedShare:'half',
  pipe_system:'two-pipe', pipeSystemSource:'user', pipeSystemConfidence:0.91, pipeSystemEvidence:['Separate supply and return pipes'],
}

const assessment = (building: BuildingInput): AssessmentResult => runAssessment(building, { flowTemperatureClass:'medium' })

describe('technician report builder', () => {
  it('builds every requested section and defaults to German', () => {
    const report = buildReport(provided, assessment(provided))
    expect(report.language).toBe('de')
    expect(report.summary.reasons.length).toBeGreaterThanOrEqual(2)
    expect(report.summary.reasons.length).toBeLessThanOrEqual(3)
    expect(report.summary.preliminaryNote).toContain('vorläufige')
    expect(report.buildingData.length).toBe(14)
    expect(report.findings.map(item=>item.id)).toEqual(['heating','flow','pipe','costs'])
    expect(Array.isArray(report.missingInformation)).toBe(true)
    expect(Array.isArray(report.greyAreas)).toBe(true)
    expect(report.onSiteChecklist.length).toBeGreaterThan(0)
    expect(report.photos).toEqual([])
  })

  it('labels homeowner and photo-estimated pipe sources correctly', () => {
    const userReport = buildReport(provided, assessment(provided), 'en')
    const userPipe = userReport.buildingData.find(entry=>entry.key==='pipeSystem')
    expect(userPipe).toMatchObject({ value:'Two-pipe', source:'provided' })

    const estimated = { ...provided, constructionOrRenovationYear:1975, pipe_system:'single-pipe' as const, pipeSystemSource:'estimated' as const, pipeSystemConfidence:0.87 }
    const estimatedReport = buildReport(estimated, assessment(estimated), 'en')
    expect(estimatedReport.buildingData.find(entry=>entry.key==='pipeSystem')).toMatchObject({ value:'Single-pipe', source:'estimated' })

    const unknown = { ...provided, pipe_system:'unknown' as const, pipeSystemSource:'unknown' as const }
    const unknownReport = buildReport(unknown, assessment(unknown), 'en')
    expect(unknownReport.buildingData.find(entry=>entry.key==='pipeSystem')).toMatchObject({ value:'Unknown', source:'unknown' })
  })

  it('orders high-priority items first and deduplicates repeated text', () => {
    const result = assessment(provided)
    const duplicate: ReportItem = { kind:'verify', text:'Duplicate check', reason:'Second source', priority:'normal' }
    const highDuplicate: ReportItem = { ...duplicate, priority:'high', reason:'First source' }
    result.modules[0].reportItems = [...(result.modules[0].reportItems ?? []), duplicate, highDuplicate]
    const report = buildReport(provided, result, 'en')
    expect(report.onSiteChecklist[0].priority).toBe('high')
    expect(report.onSiteChecklist.filter(item=>item.text==='Duplicate check')).toHaveLength(1)
    expect(report.onSiteChecklist.find(item=>item.text==='Duplicate check')?.priority).toBe('high')
  })

  it('retains empty sections and supplies empty-state copy', () => {
    const minimal: AssessmentResult = { building:provided, modules:[] }
    const report = buildReport(provided, minimal, 'en')
    expect(report.missingInformation).toEqual([])
    expect(report.greyAreas).toEqual([])
    expect(report.onSiteChecklist).toEqual([])
    expect(report.emptyText).toBe('Nothing flagged.')
  })

  it('text export includes all report entries and findings', () => {
    const result = assessment(provided)
    result.photos = [{ id:'photo-1', name:'zwei.jpg', url:'blob:test', kind:'two-pipe', label:'Two-pipe', confidence:0.91, evidence:['Separate supply and return pipes'], highlightStatus:'ready' }]
    const report = buildReport(provided, result, 'en')
    const text = exportReportAsText(report, new Set(), '24 October 2026')
    expect(text).toContain('24 October 2026')
    expect(text).toContain(report.buildingIdentifier)
    for (const item of [...report.missingInformation, ...report.greyAreas, ...report.onSiteChecklist]) {
      expect(text).toContain(item.text)
      expect(text).toContain(item.reason)
    }
    for (const finding of report.findings) {
      expect(text).toContain(finding.title)
      for (const line of finding.lines) expect(text).toContain(line)
    }
    expect(text).toContain('Separate supply and return pipes')
    expect(text).toContain('[ ]')
  })
})
