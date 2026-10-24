import { formatReportTemplate, REPORT_LOCALES } from './reportLocales'
import type { ReportItem, ReportMessageKey, ReportPriority } from './types'

export const makeReportItem = (
  messageKey: ReportMessageKey,
  kind: ReportItem['kind'],
  priority: ReportPriority = 'normal',
  params?: Record<string, string | number>,
): ReportItem => {
  const message = REPORT_LOCALES.en.messages[messageKey]
  return {
    kind,
    priority,
    messageKey,
    params,
    text: formatReportTemplate(message.text, params),
    reason: formatReportTemplate(message.reason ?? message.text, params),
  }
}
