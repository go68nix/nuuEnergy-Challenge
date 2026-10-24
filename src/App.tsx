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
    <main className="app">
      <header>
        <h1>Heat Pump Suitability Checker (Prototype)</h1>
      </header>
      <DropZone
        onParsed={(parseResult) => {
          setBuildings(parseResult.validRows)
          setRowErrors(parseResult.rowErrors)
        }}
      />
      <BuildingTable buildings={buildings} rowErrors={rowErrors} onSelectBuilding={assessBuilding} />
      <BuildingForm onSubmitBuilding={assessBuilding} />
      <ResultPanel result={result} />
    </main>
  )
}

export default App
