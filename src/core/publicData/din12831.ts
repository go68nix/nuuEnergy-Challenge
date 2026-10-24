/**
 * Lookup module for DIN EN 12831 design outdoor temperatures.
 *
 * Uses the official German postal code dataset compiled for the UBA/IFEU heat pump tool.
 */

import rawData from './din12831Data.json' with { type: 'json' }
import type { ClimateData } from './types'

const dinTable = rawData as unknown as Record<string, [number, string]>
const DEFAULT_DESIGN_TEMP_C = -12.0
const DEFAULT_MATCHED_CITY = 'Deutschland (Referenz)'
const DEFAULT_MATCHED_PLZ = '10115'

/**
 * Resolve DIN EN 12831 outdoor design temperature from a German postal code.
 *
 * :param rawPlz: Postal code as string or number.
 * :returns: Resolved ClimateData object containing temperature, city, and provenance.
 */
export const lookupDesignOutdoorTemperature = (rawPlz: string | number): ClimateData => {
  const cleaned = String(rawPlz).trim().replace(/\D/g, '')
  if (!cleaned) {
    return {
      matchedPlz: DEFAULT_MATCHED_PLZ,
      matchedCity: DEFAULT_MATCHED_CITY,
      designOutdoorTempC: DEFAULT_DESIGN_TEMP_C,
      source: 'DIN EN 12831 (Default)',
    }
  }

  const padded = cleaned.length <= 5 ? cleaned.padStart(5, '0') : cleaned.slice(0, 5)
  if (padded in dinTable) {
    const [temp, city] = dinTable[padded]
    return {
      matchedPlz: padded,
      matchedCity: city,
      designOutdoorTempC: temp,
      source: 'DIN EN 12831 (UBA / IFEU Reference Table)',
    }
  }

  const targetNum = Number.parseInt(padded, 10)
  let nearestPlz = DEFAULT_MATCHED_PLZ
  let minDiff = Number.POSITIVE_INFINITY

  for (const plzKey of Object.keys(dinTable)) {
    const diff = Math.abs(Number.parseInt(plzKey, 10) - targetNum)
    if (diff < minDiff) {
      minDiff = diff
      nearestPlz = plzKey
      if (diff === 0) break
    }
  }

  const [nearestTemp, nearestCity] = dinTable[nearestPlz]
  return {
    matchedPlz: nearestPlz,
    matchedCity: nearestCity,
    designOutdoorTempC: nearestTemp,
    source: `DIN EN 12831 (Nearest PLZ ${nearestPlz})`,
  }
}
