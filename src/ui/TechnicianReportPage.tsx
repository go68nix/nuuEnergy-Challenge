import { useMemo, useState } from 'react'
import type { AssessmentResult } from '../core/types'
import { buildReport, exportReportAsText } from '../core/report'
import { REPORT_LOCALES, type ReportLanguage } from '../core/reportLocales'

type Props = { assessment: AssessmentResult; onBack: () => void }

export const TechnicianReportPage = ({ assessment, onBack }: Props) => {
  const [language, setLanguage] = useState<ReportLanguage>('de')
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState(false)
  const report = useMemo(() => buildReport(assessment.building, assessment, language), [assessment, language])
  const locale = REPORT_LOCALES[language]
  const date = new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'long' }).format(new Date())
  const copyText = async () => {
    const text = exportReportAsText(report, new Set(Object.entries(checked).filter(([, value]) => value).map(([key]) => key)), date)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const renderItems = (items: typeof report.missingInformation) => items.length ? items.map(item => <article className="report-flag" key={item.id}>
    <div className={`priority-marker ${item.priority}`}>{locale.labels[item.priority]}</div><strong>{item.text}</strong><p>{item.reason}</p>
  </article>) : <p className="report-empty">{report.emptyText}</p>

  return <main className="technician-report" lang={language}>
    <header className="report-header">
      <div><span className="eyebrow">{report.subtitle}</span><h1>{report.title}</h1><p className="report-building-id">{locale.labels.buildingId}: <strong>{report.buildingIdentifier}</strong></p><p className="report-date">{locale.labels.date}: {date}</p></div>
      <div className="report-tools no-print"><label>{locale.language}<select value={language} onChange={event => setLanguage(event.target.value as ReportLanguage)}><option value="de">Deutsch</option><option value="en">English</option></select></label><button className="button-secondary" onClick={() => window.print()}>{locale.print}</button><button className="button-secondary" onClick={() => void copyText()}>{copied ? locale.copied : locale.copy}</button></div>
    </header>
    <section className="report-section report-summary">
      <h2>{locale.sections.summary}</h2><div className={`traffic-badge ${report.summary.level}`}>{report.summary.label}</div>
      <ul className="summary-reasons">{report.summary.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><p className="preliminary-note">{report.summary.preliminaryNote}</p>
    </section>
    <section className="report-section"><h2>{locale.sections.building}</h2><div className="report-data-grid">{report.buildingData.map(entry=><article className="report-data-item" key={entry.key}><span>{entry.label}</span><strong>{entry.value}</strong><small>{locale.labels.source}: {locale.labels[entry.source]}</small></article>)}</div></section>
    <section className="report-section"><h2>{locale.sections.findings}</h2><div className="report-findings">{report.findings.map(finding=><article className="report-finding" key={finding.id}><h3>{finding.title}</h3><ul>{finding.lines.map(line=><li key={line}>{line}</li>)}</ul></article>)}</div></section>
    <section className="report-section"><h2>{locale.sections.missing}</h2><div className="report-flag-list">{renderItems(report.missingInformation)}</div></section>
    <section className="report-section"><h2>{locale.sections.grey}</h2><div className="report-flag-list">{renderItems(report.greyAreas)}</div></section>
    <section className="report-section"><h2>{locale.sections.checklist}</h2>{report.onSiteChecklist.length ? <div className="report-checklist">{report.onSiteChecklist.map(item=><label className="report-check-item" key={item.id}><input type="checkbox" checked={Boolean(checked[item.id])} onChange={event => setChecked(current => ({ ...current, [item.id]: event.target.checked }))}/><span className="check-copy"><strong>{item.text}</strong><small>{item.reason}</small></span><span className={`priority-marker ${item.priority}`}>{locale.labels[item.priority]}</span></label>)}</div> : <p className="report-empty">{report.emptyText}</p>}</section>
    <section className="report-section"><h2>{locale.sections.photos}</h2>{report.photos.length ? <div className="report-photo-grid">{report.photos.map(photo=><article className="report-photo" key={photo.id}><img src={photo.highlightedUrl ?? photo.url} alt={photo.label}/><div><strong>{photo.label}</strong><span>{locale.labels.confidence}: {Math.round(photo.confidence * 100)}%</span>{photo.evidence.length ? <ul>{photo.evidence.map(item=><li key={item}>{item}</li>)}</ul> : <p>{report.emptyText}</p>}</div></article>)}</div> : <p className="report-empty">{report.emptyText}</p>}</section>
    <footer className="report-footer no-print"><button className="text-button" onClick={onBack}>← &nbsp;{locale.back}</button></footer>
  </main>
}
