import { useState } from 'react'
import { runAssessment } from './core/registry'
import type { AssessmentResult, BuildingInput } from './core/types'
import { DropZone } from './ui/DropZone'
import { BuildingForm } from './ui/BuildingForm'
import { BuildingTable } from './ui/BuildingTable'
import { ResultPanel } from './ui/ResultPanel'

function App() {
  const [buildings, setBuildings] = useState<BuildingInput[]>([])
  const [rowErrors, setRowErrors] = useState<{ row: number; errors: string[] }[]>([])
  const [result, setResult] = useState<AssessmentResult | null>(null)

  const assessBuilding = (building: BuildingInput) => {
    setResult(runAssessment(building))
  }

  return (
    <main className="app" id="top">
      <header className="site-header"><a className="brand" href="#top"><span className="brand-mark">n</span> nuu<span>energy</span></a><span className="header-tag">HOME ENERGY ASSESSMENT</span></header>
      <BuildingForm onSubmitBuilding={assessBuilding} />
      <ResultPanel result={result} />
      <details className="import-area"><summary>Already have your data? Import a CSV</summary><DropZone
        onParsed={(parseResult) => { setBuildings(parseResult.validRows); setRowErrors(parseResult.rowErrors) }}
      /><BuildingTable buildings={buildings} rowErrors={rowErrors} onSelectBuilding={assessBuilding} /></details>
    </main>
  )
}

export default App
