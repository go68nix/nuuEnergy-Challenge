import { formatReportTemplate, REPORT_LOCALES, type ReportLanguage } from './reportLocales'
import type { AssessmentResult, BuildingInput, HeaterPhoto, ReportItem } from './types'

export type ReportBuildingSource = 'provided' | 'estimated' | 'unknown'
export type ReportBuildingEntry = { key: string; label: string; value: string; source: ReportBuildingSource }
export type ReportFinding = { id: string; title: string; lines: string[] }
export type ReportChecklistEntry = ReportItem & { id: string }
export type ReportPhoto = Pick<HeaterPhoto, 'id' | 'url' | 'highlightedUrl' | 'kind' | 'confidence' | 'evidence' | 'label'>

export type Report = {
  language: ReportLanguage
  title: string
  subtitle: string
  buildingIdentifier: string
  summary: { level: 'green' | 'yellow' | 'red'; label: string; reasons: string[]; preliminaryNote: string }
  buildingData: ReportBuildingEntry[]
  findings: ReportFinding[]
  missingInformation: ReportChecklistEntry[]
  greyAreas: ReportChecklistEntry[]
  onSiteChecklist: ReportChecklistEntry[]
  photos: ReportPhoto[]
  emptyText: string
}

type AssessmentData = Record<string, unknown>
const record = (value: unknown): AssessmentData => value && typeof value === 'object' ? value as AssessmentData : {}
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined
const fmt = (value: number, language: ReportLanguage, digits = 0) => new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-GB', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)
const money = (value: number, language: ReportLanguage) => new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)

const sourceFor = (value: unknown): ReportBuildingSource => value === undefined || value === null || value === '' || value === 'unknown' ? 'unknown' : 'provided'
const translatedValue = (value: unknown, values: Record<string, string>, language: ReportLanguage) => {
  if (typeof value === 'boolean') return REPORT_LOCALES[language].labels[value ? 'yes' : 'no']
  if (typeof value === 'number') return fmt(value, language)
  if (typeof value === 'string') return values[value] ?? value
  return REPORT_LOCALES[language].labels.notAvailable
}

const localizeItem = (item: ReportItem, language: ReportLanguage): ReportChecklistEntry => {
  const localized = item.messageKey ? REPORT_LOCALES[language].messages[item.messageKey] : undefined
  const text = localized ? formatReportTemplate(localized.text, item.params) : item.text
  const reason = localized?.reason ? formatReportTemplate(localized.reason, item.params) : item.reason
  return { ...item, text, reason, id: item.messageKey ?? item.text }
}

const deduplicate = (items: ReportChecklistEntry[]) => {
  const unique = new Map<string, ReportChecklistEntry>()
  for (const item of items) {
    const previous = unique.get(item.text)
    if (!previous || (item.priority === 'high' && previous.priority !== 'high')) unique.set(item.text, item)
  }
  return [...unique.values()].sort((a, b) => Number(b.priority === 'high') - Number(a.priority === 'high'))
}

const localizedBuildingData = (building: BuildingInput, language: ReportLanguage): ReportBuildingEntry[] => {
  const locale = REPORT_LOCALES[language]
  const { fields, values, labels } = locale
  const generic = [
    ['fuelType', fields.fuel, building.heatingSystem ?? building.fuelType, sourceFor(building.heatingSystem ?? building.fuelType)],
    ['annualConsumption', fields.consumption, `${fmt(building.annualConsumption, language)} ${building.fuelType === 'gas_m3' ? 'm³' : building.fuelType === 'heating_oil_l' ? 'L' : 'kWh'} / ${language === 'de' ? 'Jahr' : 'year'}`, sourceFor(building.annualConsumption)],
    ['occupants', fields.occupants, building.occupants, sourceFor(building.occupants)],
    ['constructionYear', fields.constructionYear, building.constructionOrRenovationYear, sourceFor(building.constructionOrRenovationYear)],
    ['floorArea', fields.floorArea, `${fmt(building.heatedFloorAreaM2, language)} m²`, sourceFor(building.heatedFloorAreaM2)],
    ['heatingDistribution', fields.heatingDistribution, building.heatingDistribution, sourceFor(building.heatingDistribution)],
    ['buildingType', fields.buildingType, building.buildingType, sourceFor(building.buildingType)],
    ['heatingSystem', fields.heatingSystem, building.heatingSystem, sourceFor(building.heatingSystem)],
    ['facadeInsulated', fields.facade, building.facadeInsulated, sourceFor(building.facadeInsulated)],
    ['roofInsulated', fields.roof, building.roofInsulated, sourceFor(building.roofInsulated)],
    ['heatingSystemAge', fields.systemAge, building.heatingSystemAge, sourceFor(building.heatingSystemAge)],
    ['replacementTiming', fields.replacementTiming, building.replacementTiming, sourceFor(building.replacementTiming)],
    ['winterHeatedShare', fields.winterShare, building.winterHeatedShare, sourceFor(building.winterHeatedShare)],
  ] as const
  const entries: ReportBuildingEntry[] = generic.map(([key, label, value, source]) => ({
    key, label, source, value: translatedValue(value, values, language),
  }))
  const pipeSource: ReportBuildingSource = building.pipeSystemSource === 'user' ? 'provided' : building.pipeSystemSource === 'estimated' ? 'estimated' : 'unknown'
  entries.push({ key: 'pipeSystem', label: fields.pipeSystem, value: building.pipe_system ? translatedValue(building.pipe_system, values, language) : labels.unknown, source: pipeSource })
  return entries
}

export const buildReport = (building: BuildingInput, assessment: AssessmentResult, language: ReportLanguage = 'de'): Report => {
  const locale = REPORT_LOCALES[language]
  const modules = new Map(assessment.modules.map(module => [module.id, module]))
  const allItems = deduplicate(assessment.modules.flatMap(module => (module.reportItems ?? []).map(item => localizeItem(item, language))))
  const buildingData = localizedBuildingData(building, language)
  const missingInformation = allItems.filter(item => item.kind === 'missing')
  const greyAreas = allItems.filter(item => item.kind === 'uncertain')
  const onSiteChecklist = allItems.filter(item => item.kind === 'verify')

  const trafficData = record(modules.get('traffic_light')?.data)
  let trafficLevel: 'green' | 'yellow' | 'red' = trafficData.level === 'green' || trafficData.level === 'red' ? trafficData.level : 'yellow'
  const energyIntensity = building.heatedFloorAreaM2 > 0 ? (building.annualConsumption * (building.fuelType === 'gas_kwh' ? 1 : 10)) / building.heatedFloorAreaM2 : Number.POSITIVE_INFINITY
  if (building.pipeSystemSource === 'user' && building.pipe_system === 'single-pipe') trafficLevel = 'red'
  else if (energyIntensity > 500) trafficLevel = 'red'
  const specificReasonKeys = Array.isArray(trafficData.reasonKeys) ? trafficData.reasonKeys as string[] : []
  const specificReasons = specificReasonKeys.map(key => locale.messages[key]?.text).filter((text): text is string => Boolean(text))
  const trafficReasons = [...new Set([...specificReasons, ...locale.summaryReasons[trafficLevel]])].slice(0, 2)
  const buildingType = building.buildingType ? locale.values[building.buildingType] : undefined
  const buildingIdentifier = [buildingType ?? (language === 'de' ? 'Gebäude' : 'Building'), building.constructionOrRenovationYear, `${fmt(building.heatedFloorAreaM2, language)} m²`].join(' · ')

  const heating = record(modules.get('heating_load')?.data)
  const methodARange = number(heating.methodAKw)
  const methodB = Array.isArray(heating.methodBRangeKw) ? heating.methodBRangeKw.map(Number) as [number, number] : undefined
  const combined = Array.isArray(heating.rangeKw) ? heating.rangeKw.map(Number) as [number, number] : undefined
  const pipe = record(modules.get('pipe_type')?.data)
  const costs = record(modules.get('operating_cost')?.data)
  const flowClass = assessment.context?.flowTemperatureClass
  const flowLabels = language === 'de' ? { low: 'Niedrig', medium: 'Mittel', high: 'Hoch' } : { low: 'Low', medium: 'Medium', high: 'High' }
  const findings: ReportFinding[] = [
    { id: 'heating', title: locale.findings.heating, lines: [
      `${locale.labels.methodA}: ${methodARange === undefined ? locale.labels.notAvailable : `${fmt(methodARange, language, 1)} kW`}`,
      `${locale.labels.methodB}: ${methodB ? `${fmt(methodB[0], language, 1)}–${fmt(methodB[1], language, 1)} kW` : locale.labels.notAvailable}`,
      `${locale.labels.range}: ${combined ? `${fmt(combined[0], language, 1)}–${fmt(combined[1], language, 1)} kW` : locale.labels.notAvailable}`,
    ] },
    { id: 'flow', title: locale.findings.flow, lines: [`${locale.labels.flowTemp}: ${flowClass ? flowLabels[flowClass] : locale.labels.unknown}`] },
    { id: 'pipe', title: locale.findings.pipe, lines: [
      `${locale.labels.pipe}: ${translatedValue(pipe.pipe_system ?? building.pipe_system, locale.values, language)}`,
      `${locale.labels.source}: ${pipe.source === 'user' ? locale.labels.provided : pipe.source === 'estimated' ? locale.labels.estimated : locale.labels.unknown}`,
      `${locale.labels.confidence}: ${number(pipe.confidence ?? building.pipeSystemConfidence) === undefined ? locale.labels.notAvailable : `${Math.round(Number(pipe.confidence ?? building.pipeSystemConfidence) * 100)}%`}`,
      `${locale.labels.basis}: ${pipe.source === 'user' ? (language === 'de' ? 'Vom Bewohner ausgewählt.' : 'Selected by the homeowner.') : pipe.source === 'estimated' ? (language === 'de' ? 'Fotoschätzung; vor Ort bestätigen.' : 'Photo estimate; confirm on site.') : formatReportTemplate(locale.labels.yearFallback, { year: building.constructionOrRenovationYear })}`,
      ...((Array.isArray(pipe.evidence) ? pipe.evidence : building.pipeSystemEvidence ?? []).length ? [`${locale.labels.evidence}: ${(Array.isArray(pipe.evidence) ? pipe.evidence as string[] : building.pipeSystemEvidence ?? []).map(evidence => locale.evidence[evidence as keyof typeof locale.evidence] ?? evidence).join('; ')}`] : []),
    ] },
    { id: 'costs', title: locale.findings.costs, lines: [
      `${locale.labels.currentCost}: ${number(costs.currentCostEur) === undefined ? locale.labels.notAvailable : money(Number(costs.currentCostEur), language)}`,
      `${locale.labels.heatPumpCost}: ${number(costs.estimatedHeatPumpCostEur) === undefined ? locale.labels.notAvailable : money(Number(costs.estimatedHeatPumpCostEur), language)}`,
      `${locale.labels.savings}: ${number(costs.annualSavingsEur) === undefined ? locale.labels.notAvailable : money(Number(costs.annualSavingsEur), language)}`,
      `${locale.labels.jaz}: ${number(costs.jaz) === undefined ? locale.labels.notAvailable : fmt(Number(costs.jaz), language, 1)}`,
      locale.labels.costBasis,
    ] },
  ]

  const photos: ReportPhoto[] = (assessment.photos ?? []).map(photo => ({
    id: photo.id, url: photo.url, highlightedUrl: photo.highlightedUrl, kind: photo.kind,
    label: locale.photoLabels[photo.kind], confidence: photo.confidence,
    evidence: photo.evidence.map(evidence => locale.evidence[evidence as keyof typeof locale.evidence] ?? evidence),
  }))

  return {
    language,
    title: locale.title,
    subtitle: locale.subtitle,
    buildingIdentifier,
    summary: { level: trafficLevel, label: locale.traffic[trafficLevel], reasons: trafficReasons, preliminaryNote: locale.labels.preliminary },
    buildingData,
    findings,
    missingInformation,
    greyAreas,
    onSiteChecklist,
    photos,
    emptyText: locale.labels.nothingFlagged,
  }
}

export const exportReportAsText = (report: Report, checkedChecklistIds: Set<string> = new Set(), reportDate?: string) => {
  const locale = REPORT_LOCALES[report.language]
  const section = (title: string, lines: string[]) => `${title}\n${lines.join('\n') || report.emptyText}`
  const reportItems = (items: ReportChecklistEntry[]) => items.map(item => `${item.priority === 'high' ? `[${locale.labels.high}] ` : ''}${item.text} — ${item.reason}`)
  return [
    report.title,
    report.subtitle,
    `${locale.labels.buildingId}: ${report.buildingIdentifier}`,
    ...(reportDate ? [`${locale.labels.date}: ${reportDate}`] : []),
    section(locale.sections.summary, [report.summary.label, ...report.summary.reasons, report.summary.preliminaryNote]),
    section(locale.sections.building, report.buildingData.map(item => `${item.label}: ${item.value} (${locale.labels.source}: ${locale.labels[item.source]})`)),
    section(locale.sections.findings, report.findings.flatMap(finding => [`${finding.title}:`, ...finding.lines.map(line => `  ${line}`)])),
    section(locale.sections.missing, reportItems(report.missingInformation)),
    section(locale.sections.grey, reportItems(report.greyAreas)),
    section(locale.sections.checklist, report.onSiteChecklist.map(item => `${checkedChecklistIds.has(item.id) ? '[x]' : '[ ]'} ${item.text} — ${item.reason}`)),
    section(locale.sections.photos, report.photos.map(photo => `${photo.label} (${Math.round(photo.confidence * 100)}%): ${photo.evidence.join('; ')}`)),
  ].join('\n\n')
}
