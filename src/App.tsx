import { useCallback, useState } from 'react'
import { runAssessment } from './core/registry'
import type { AssessmentResult, BuildingInput } from './core/types'
import { DropZone } from './ui/DropZone'
import { BuildingForm } from './ui/BuildingForm'
import { BuildingTable } from './ui/BuildingTable'
import { ResultPanel } from './ui/ResultPanel'
import { TechnicianReportPage } from './ui/TechnicianReportPage'

function App() {
  const [buildings, setBuildings] = useState<BuildingInput[]>([])
  const [rowErrors, setRowErrors] = useState<{ row: number; errors: string[] }[]>([])
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [view, setView] = useState<'results' | 'report'>('results')

  const assessBuilding = (building: BuildingInput, photos: import('./core/types').HeaterPhoto[] = []) => {
    setResult({ ...runAssessment(building, { photos }), photos })
    setView('results')
  }
  const updateAssessmentPhotos = useCallback((photos: import('./core/types').HeaterPhoto[]) => {
    setResult((current) => current ? { ...current, photos } : current)
  }, [])

  return (
    <main className="app" id="top">
      <header className="site-header"><a className="brand" href="#top"><span className="brand-mark">n</span> nuu<span>energy</span></a><span className="header-tag">HOME ENERGY ASSESSMENT</span></header>
      {view === 'report' && result ? <TechnicianReportPage assessment={result} onBack={() => setView('results')} /> : <>
      <BuildingForm onSubmitBuilding={assessBuilding} onPhotosChange={updateAssessmentPhotos} />
      <ResultPanel result={result} onOpenReport={() => setView('report')} />
      <details className="import-area"><summary>Already have your data? Import a CSV</summary><DropZone
        onParsed={(parseResult) => { setBuildings(parseResult.validRows); setRowErrors(parseResult.rowErrors) }}
      /><BuildingTable buildings={buildings} rowErrors={rowErrors} onSelectBuilding={assessBuilding} /></details>
      </>}
    </main>
  )
}

export default App
