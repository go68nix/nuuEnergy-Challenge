import Papa from 'papaparse'
import { buildingSchema } from '../core/schema'
import type { BuildingInput } from '../core/types'

type CsvRowError = {
  row: number
  errors: string[]
}

export type CsvParseResult = {
  validRows: BuildingInput[]
  rowErrors: CsvRowError[]
}

export const parseBuildingsCsv = (csvText: string): CsvParseResult => {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })

  const validRows: BuildingInput[] = []
  const rowErrors: CsvRowError[] = []

  if (parsed.errors.length > 0) {
    rowErrors.push(
      ...parsed.errors.map((error) => ({
        row: (error.row ?? 0) + 2,
        errors: [error.message],
      })),
    )
  }

  parsed.data.forEach((row, index) => {
    const validationResult = buildingSchema.safeParse(row)
    if (validationResult.success) {
      validRows.push(validationResult.data)
      return
    }

    rowErrors.push({
      row: index + 2,
      errors: validationResult.error.issues.map((issue) => {
        const field = issue.path.join('.') || 'row'
        return `${field}: ${issue.message}`
      }),
    })
  })

  return { validRows, rowErrors }
}
