import type { AssessmentResult, ModuleResult } from '../core/types'

type ResultPanelProps = {
  result: AssessmentResult | null
}

const renderData = (data: unknown): string => {
  if (data === undefined) {
    return ''
  }

  return JSON.stringify(data, null, 2)
}

const moduleStatusLabel = (moduleResult: ModuleResult) => {
  if (moduleResult.status === 'not_implemented') {
    return 'Not implemented yet'
  }

  return moduleResult.status
}

export const ResultPanel = ({ result }: ResultPanelProps) => {
  return (
    <section className="card">
      <h2>Assessment result</h2>
      {!result ? (
        <p>Select a loaded building or submit the form to run the assessment.</p>
      ) : (
        <div className="results">
          {result.modules.map((moduleResult) => (
            <article className="module-result" key={moduleResult.id}>
              <h3>{moduleResult.label}</h3>
              <p>
                <strong>Status:</strong> {moduleStatusLabel(moduleResult)}
              </p>
              {moduleResult.notes && moduleResult.notes.length > 0 && (
                <ul>
                  {moduleResult.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
              {moduleResult.data !== undefined && <pre>{renderData(moduleResult.data)}</pre>}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
