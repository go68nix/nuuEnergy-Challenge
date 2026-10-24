import { describe, expect, it } from 'vitest'
import { parseBuildingsCsv } from '../src/io/csv'

describe('parseBuildingsCsv', () => {
  it('parses valid rows', () => {
    const csv = [
      'fuelType,annualConsumption,occupants,constructionOrRenovationYear,heatedFloorAreaM2',
      'gas_m3,1800,3,1995,150',
    ].join('\n')

    const result = parseBuildingsCsv(csv)

    expect(result.validRows).toHaveLength(1)
    expect(result.rowErrors).toHaveLength(0)
  })

  it('returns row-level validation errors', () => {
    const csv = [
      'fuelType,annualConsumption,occupants,constructionOrRenovationYear,heatedFloorAreaM2',
      'gas_kwh,12000,2,2010,130',
      'invalid_fuel,10000,0,2200,0',
    ].join('\n')

    const result = parseBuildingsCsv(csv)

    expect(result.validRows).toHaveLength(1)
    expect(result.rowErrors).toHaveLength(1)
    expect(result.rowErrors[0].row).toBe(3)
  })
})
