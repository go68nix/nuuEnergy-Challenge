import { afterEach, describe, expect, it, vi } from 'vitest'
import { lookupDesignOutdoorTemperature } from '../src/core/publicData/din12831'
import { lookupDsoByPlz } from '../src/core/publicData/dsoDirectory'
import { lookupZensusPriors } from '../src/core/publicData/zensusPriors'
import { calculateSubsidies } from '../src/core/publicData/subsidies'
import { lookupPublicData } from '../src/core/publicData/service'
import { publicDataModule } from '../src/core/modules/publicData'

describe('DIN EN 12831 Outdoor Design Temperature', () => {
  it('looks up exact temperatures for known major German postal codes', () => {
    const munich = lookupDesignOutdoorTemperature('80331')
    expect(munich.matchedCity).toContain('München')
    expect(munich.designOutdoorTempC).toBe(-11.1)

    const berlin = lookupDesignOutdoorTemperature('10115')
    expect(berlin.matchedCity).toContain('Berlin')
    expect(berlin.designOutdoorTempC).toBe(-11.1)

    const cologne = lookupDesignOutdoorTemperature('50667')
    expect(cologne.matchedCity).toContain('Köln')
    expect(cologne.designOutdoorTempC).toBe(-7.0)
  })

  it('finds nearest postal code when code is missing or partial', () => {
    const fallback = lookupDesignOutdoorTemperature('')
    expect(fallback.designOutdoorTempC).toBe(-12.0)

    const nearest = lookupDesignOutdoorTemperature('80330')
    expect(nearest.matchedCity).toContain('München')
  })
})

describe('DSO Directory and Section 14a EnWG Guarantee', () => {
  it('identifies responsible grid operators and statutory connection guarantee', () => {
    const munichDso = lookupDsoByPlz('80331')
    expect(munichDso.dsoName).toContain('SWM Infrastruktur')
    expect(munichDso.section14aGuaranteed).toBe(true)
    expect(munichDso.reducedGridFeeEligible).toBe(true)

    const berlinDso = lookupDsoByPlz('10115')
    expect(berlinDso.dsoName).toContain('Stromnetz Berlin')
    expect(berlinDso.section14aGuaranteed).toBe(true)

    const hamburgDso = lookupDsoByPlz('20095')
    expect(hamburgDso.dsoName).toContain('Stromnetz Hamburg')
  })
})

describe('Destatis Zensus Priors', () => {
  it('returns regional statistical building and heating priors', () => {
    const bavaria = lookupZensusPriors('80331')
    expect(bavaria.state).toContain('Bayern')
    expect(bavaria.estimatedYear).toBeGreaterThan(1960)

    const nrw = lookupZensusPriors('50667')
    expect(nrw.state).toContain('Nordrhein-Westfalen')
    expect(nrw.dominantFuel).toBe('gas')
  })
})

describe('KfW 458 and Municipal Subsidies', () => {
  it('calculates federal base grant and climate speed bonus', () => {
    const sub = calculateSubsidies({
      rawPlz: '80331',
      heatingSystem: 'oil',
      heatingSystemAge: '20_29',
    })
    expect(sub.federalBasePercent).toBe(30)
    expect(sub.speedBonusPercent).toBe(16)
    expect(sub.regionalProgramName).toContain('Münchner Förderprogramm')
    expect(sub.regionalBonusPercent).toBe(15)
  })

  it('caps federal subsidy correctly and includes Hamburg IFB bonus', () => {
    const hamburgSub = calculateSubsidies({
      rawPlz: '20095',
      heatingSystem: 'gas',
      heatingSystemAge: '30_plus',
      taxableIncomeUnder40k: true,
    })
    const totalFed = Math.min(
      hamburgSub.federalBasePercent + hamburgSub.speedBonusPercent + hamburgSub.incomeBonusMaxPercent,
      70,
    )
    expect(totalFed).toBe(70)
    expect(hamburgSub.regionalProgramName).toContain('Hamburg IFB')
    expect(hamburgSub.regionalBonusPercent).toBe(20)
  })
})

describe('Integrated Public Data Service & Module', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('synthesizes multi-source public data and performs cross-checks', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json([{
      osm_type: 'relation', osm_id: 1, lat: '48.137', lon: '11.575', display_name: '80331, München, Bayern, Deutschland',
      category: 'boundary', address: { postcode: '80331', city: 'München' }, extratags: {},
    }])))
    const pd = await lookupPublicData('80331 München', {
      heatedFloorAreaM2: 150,
      buildingType: 'single_two_family',
      heatingSystem: 'gas',
    })

    expect(pd.postalCode).toBe('80331')
    expect(pd.city).toContain('München')
    expect(pd.climate?.designOutdoorTempC).toBe(-11.1)
    expect(pd.grid?.dsoName).toContain('SWM Infrastruktur')
    expect(pd.crossChecks.length).toBeGreaterThan(0)

    const modResult = publicDataModule.run({
      fuelType: 'gas_kwh',
      annualConsumption: 18000,
      constructionOrRenovationYear: 1990,
      heatedFloorAreaM2: 150,
      publicData: pd,
    })

    expect(modResult.status).toBe('ok')
    expect(modResult.notes?.some((n) => n.includes('SWM Infrastruktur'))).toBe(true)
  })

  it('handles skipped location smoothly with transparent defaults', () => {
    const modResult = publicDataModule.run({
      fuelType: 'gas_kwh',
      annualConsumption: 18000,
      constructionOrRenovationYear: 1990,
      heatedFloorAreaM2: 150,
    })

    expect(modResult.status).toBe('ok')
    expect(modResult.notes?.[0]).toContain('Location was skipped')
  })

  it('automatically hydrates publicData and climate design temperature from location string', () => {
    const building = {
      location: '80331 München',
      fuelType: 'gas_kwh' as const,
      annualConsumption: 14000,
      constructionOrRenovationYear: 2005,
      heatedFloorAreaM2: 130,
    }

    const modResult = publicDataModule.run(building)

    expect(modResult.status).toBe('ok')
    expect(building.publicData).toBeDefined()
    expect(building.publicData?.postalCode).toBe('80331')
    expect(building.designOutdoorTempC).toBe(-11.1)
    expect(modResult.notes?.some((n) => n.includes('-11.1°C'))).toBe(true)
  })
})
