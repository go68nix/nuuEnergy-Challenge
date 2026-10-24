import { describe, expect, it } from 'vitest'
import { lookupDesignOutdoorTemperature } from '../src/core/publicData/din12831'
import { lookupDsoByPlz } from '../src/core/publicData/dsoDirectory'
import { lookupZensusPriors } from '../src/core/publicData/zensusPriors'
import { calculateSubsidies } from '../src/core/publicData/subsidies'
import { parseLocationInput, runSiftTournament, runAbMctsArbitration } from '../src/core/publicData/siftMctsSearch'
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

describe('Non-LLM SIFT Tournament and AB-MCTS Arbitration', () => {
  it('ranks cadastre candidates head-to-head using Bradley-Terry preference', () => {
    const query = parseLocationInput('Sendlinger Str. 10, 80331 München')
    expect(query.postalCode).toBe('80331')
    expect(query.houseNumber).toBe('10')

    const candidates = [
      { id: 'c1', label: 'Sendlinger Str. 10, 80331', postalCode: '80331', street: 'Sendlinger Str.', houseNumber: '10', footprintM2: 110 },
      { id: 'c2', label: '80331 München Quartier', postalCode: '80331', footprintM2: 50 },
    ]

    const result = runSiftTournament(query, candidates)
    expect(result.winnerLabel).toContain('Sendlinger Str. 10')
    expect(result.winProbability).toBeGreaterThan(0.5)
  })

  it('runs AB-MCTS arbitration across information branches', () => {
    let executed = 0
    const tasks = [
      { name: 'b1', depth: 1, priorWeight: 0.9, execute: () => { executed++; return { success: true, evidenceQuality: 1.0 } } },
      { name: 'b2', depth: 2, priorWeight: 0.8, execute: () => { executed++; return { success: true, evidenceQuality: 0.9 } } },
    ]
    const branches = runAbMctsArbitration(tasks)
    expect(executed).toBe(2)
    expect(branches.length).toBe(2)
    expect(branches[0].ucbScore).toBeGreaterThan(0)
  })
})

describe('Integrated Public Data Service & Module', () => {
  it('synthesizes multi-source public data and performs cross-checks', async () => {
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
    expect(building.publicData?.city).toContain('München')
    expect(building.designOutdoorTempC).toBe(-11.1)
    expect(modResult.notes?.some((n) => n.includes('-11.1°C'))).toBe(true)
  })
})
