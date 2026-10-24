/**
 * Destatis Zensus 2022 regional priors by postal code.
 *
 * Supplies statistical baselines for construction periods and dominant heating energy
 * carriers when individual building ground truth is omitted or uncertain.
 */

import type { ZensusPriors } from './types'

type StatePrior = {
  state: string
  dominantEra: string
  estimatedYear: number
  dominantFuel: 'gas' | 'oil' | 'district' | 'heat_pump' | 'pellet'
}

const PREFIX_TO_STATE_PRIOR: Record<string, StatePrior> = {
  '0': { state: 'Sachsen / Sachsen-Anhalt / Thüringen', dominantEra: '1949–1978', estimatedYear: 1968, dominantFuel: 'gas' },
  '1': { state: 'Berlin / Brandenburg / Meckl.-Vorpommern', dominantEra: '1919–1948', estimatedYear: 1935, dominantFuel: 'gas' },
  '2': { state: 'Hamburg / Schleswig-Holstein / Niedersachsen', dominantEra: '1950–1979', estimatedYear: 1965, dominantFuel: 'gas' },
  '3': { state: 'Niedersachsen / Hessen / Sachsen-Anhalt', dominantEra: '1960–1989', estimatedYear: 1974, dominantFuel: 'gas' },
  '4': { state: 'Nordrhein-Westfalen (Ruhr / Niederrhein)', dominantEra: '1950–1978', estimatedYear: 1962, dominantFuel: 'gas' },
  '5': { state: 'Nordrhein-Westfalen / Rheinland-Pfalz', dominantEra: '1955–1985', estimatedYear: 1970, dominantFuel: 'gas' },
  '6': { state: 'Hessen / Saarland / Rheinland-Pfalz', dominantEra: '1960–1989', estimatedYear: 1975, dominantFuel: 'gas' },
  '7': { state: 'Baden-Württemberg', dominantEra: '1965–1994', estimatedYear: 1978, dominantFuel: 'oil' },
  '8': { state: 'Bayern (Südbayern / Schwaben)', dominantEra: '1968–1998', estimatedYear: 1982, dominantFuel: 'oil' },
  '9': { state: 'Bayern (Franken / Oberpfalz) / Thüringen', dominantEra: '1965–1992', estimatedYear: 1976, dominantFuel: 'oil' },
}

/**
 * Lookup Zensus 2022 priors for a given postal code.
 *
 * :param rawPlz: German postal code.
 * :returns: ZensusPriors with state name, dominant building era, typical year, and dominant fuel.
 */
export const lookupZensusPriors = (rawPlz: string | number): ZensusPriors => {
  const cleaned = String(rawPlz).trim().replace(/\D/g, '')
  const firstDigit = cleaned.charAt(0)
  const prior = PREFIX_TO_STATE_PRIOR[firstDigit] ?? {
    state: 'Deutschland (Bundesweit)',
    dominantEra: '1950–1979',
    estimatedYear: 1972,
    dominantFuel: 'gas' as const,
  }

  return {
    state: prior.state,
    dominantEra: prior.dominantEra,
    estimatedYear: prior.estimatedYear,
    dominantFuel: prior.dominantFuel,
    source: 'Destatis Zensus 2022 (Gebäude- und Wohnungszählung)',
  }
}
