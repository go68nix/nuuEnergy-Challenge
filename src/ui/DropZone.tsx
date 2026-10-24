import { useRef, useState } from 'react'
import { parseBuildingsCsv, type CsvParseResult } from '../io/csv'

type DropZoneProps = {
  onParsed: (result: CsvParseResult) => void
}

export const DropZone = ({ onParsed }: DropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const parseFile = async (file: File) => {
    const text = await file.text()
    onParsed(parseBuildingsCsv(text))
  }

  return (
    <section className="card">
      <h2>CSV import</h2>
      <div
        className={`dropzone ${isDragging ? 'is-dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          const file = event.dataTransfer.files?.[0]
          if (file) {
            void parseFile(file)
          }
        }}
      >
        <p>Drag and drop a CSV file here.</p>
        <button type="button" onClick={() => inputRef.current?.click()}>
          Choose CSV file
        </button>
        <input
          ref={inputRef}
          hidden
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              void parseFile(file)
            }
          }}
        />
      </div>
    </section>
  )
}
