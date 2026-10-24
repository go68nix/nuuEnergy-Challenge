/**
 * Public data lookup for a building location.
 *
 * The place comes from Nominatim (OpenStreetMap). The design temperature, grid operator,
 * Zensus prior and subsidies are table lookups for the postal code of that place.
 */

import type { BuildingInput } from '../types'
import { lookupDesignOutdoorTemperature } from './din12831'
import { lookupDsoByPlz } from './dsoDirectory'
import { geocodeAddress } from './geocode'
import { calculateSubsidies } from './subsidies'
import type { CrossCheckItem, PublicDataResult } from './types'
import { lookupZensusPriors } from './zensusPriors'

/**
 * Build the regional public data for one postal code.
 *
 * :param query: The location text as the homeowner typed it.
 * :param postalCode: Five-digit postal code, or ``undefined`` for the national defaults.
 * :param building: Questionnaire answers for the subsidy rules and the cross-check.
 * :returns: Public data without a geocoded place.
 */
const regionalPublicData = (
  query: string,
  postalCode: string | undefined,
  building?: Partial<BuildingInput>,
): PublicDataResult => {
  const plz = postalCode ?? ''
  const zensus = lookupZensusPriors(plz)
  const crossChecks: CrossCheckItem[] = []
  if (building?.heatingSystem) {
    const matchesDominant =
      (building.heatingSystem.includes('gas') && zensus.dominantFuel === 'gas') ||
      (building.heatingSystem.includes('oil') && zensus.dominantFuel === 'oil')
    crossChecks.push({
      field: 'heatingSystem',
      statedValue: building.heatingSystem,
      publicValue: `Region dominant: ${zensus.dominantFuel.toUpperCase()}`,
      status: 'neutral',
      message: matchesDominant
        ? `Aktueller Energieträger entspricht dem typischen Zensus-Profil der Region (${zensus.dominantFuel}).`
        : `In der Region ist statistisch ${zensus.dominantFuel} verbreitet; Umstieg auf Wärmepumpe bietet hohes CO2-Einsparpotenzial.`,
    })
  }

  return {
    query,
    postalCode,
    climate: lookupDesignOutdoorTemperature(plz),
    grid: lookupDsoByPlz(plz),
    zensus,
    subsidies: calculateSubsidies({
      rawPlz: plz,
      heatingSystem: building?.heatingSystem,
      heatingSystemAge: building?.heatingSystemAge,
    }),
    crossChecks,
    retrievedAt: new Date().toISOString(),
  }
}

/**
 * Look up public data without network access, from a postal code in the location text.
 *
 * :param locationInput: Free-text location; only a five-digit postal code in it is used.
 * :param building: Questionnaire answers for the subsidy rules and the cross-check.
 * :returns: Regional public data; the place itself stays unresolved.
 */
export const lookupPublicDataSync = (
  locationInput: string,
  building?: Partial<BuildingInput>,
): PublicDataResult => regionalPublicData(locationInput, locationInput.match(/\b\d{5}\b/)?.[0], building)

/**
 * Geocode the location with Nominatim and add the regional public data for its postal code.
 *
 * :param locationInput: Address, postal code or place as the homeowner typed it.
 * :param building: Questionnaire answers for the subsidy rules and the cross-check.
 * :returns: Public data for the geocoded place.
 * :raises Error: When Nominatim fails or finds no place for the input.
 */
export const lookupPublicData = async (
  locationInput: string,
  building?: Partial<BuildingInput>,
): Promise<PublicDataResult> => {
  const [place] = await geocodeAddress(locationInput)
  if (!place) throw new Error(`No place found for "${locationInput}"`)
  return {
    ...regionalPublicData(locationInput, place.postalCode, building),
    formattedAddress: place.label,
    city: place.city,
    coordinates: place.coordinates,
  }
}
