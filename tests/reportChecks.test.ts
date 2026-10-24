import { describe, expect, it } from 'vitest'
import {
  getEnergyIntensity,
  getGridDimmingItem,
  getHeatingLoadDisagreementItem,
  getHeatingLoadDisagreementPercent,
  getImplausibleEnergyUseItem,
  getOldBuildingUnknownSystemAgeItem,
  getPipeYearMismatchItem,
  getUnclearPhotoItem,
} from '../src/core/reportChecks'
import type { BuildingInput, HeaterPhoto } from '../src/core/types'

const building: BuildingInput = {
  fuelType: 'gas_kwh', annualConsumption: 14000, heatedFloorAreaM2: 100,
  constructionOrRenovationYear: 1975, pipe_system: 'two-pipe', pipeSystemSource: 'estimated',
}

describe('technician report cross-checks', () => {
  it('uses a strict greater-than boundary for heating-load disagreement', () => {
    expect(getHeatingLoadDisagreementPercent(13, [10, 10])).toBe(30)
    expect(getHeatingLoadDisagreementItem(13, [10, 10])).toBeUndefined()
    expect(getHeatingLoadDisagreementItem(13.01, [10, 10])).toMatchObject({ kind: 'uncertain' })
  })

  it('flags a photo pipe type that conflicts with the year estimate', () => {
    expect(getPipeYearMismatchItem(building)).toMatchObject({ kind: 'uncertain' })
    expect(getPipeYearMismatchItem({ ...building, pipe_system: 'single-pipe' })).toBeUndefined()
    expect(getPipeYearMismatchItem({ ...building, constructionOrRenovationYear: 1990 })).toBeUndefined()
  })

  it('flags unknown heating-system age at 30 building years and not at 29', () => {
    expect(getOldBuildingUnknownSystemAgeItem({ ...building, heatingSystemAge: 'unknown' }, 2026)).toMatchObject({ kind: 'uncertain' })
    expect(getOldBuildingUnknownSystemAgeItem({ ...building, constructionOrRenovationYear: 1997, heatingSystemAge: 'unknown' }, 2026)).toBeUndefined()
  })

  it('flags unclear photo results and leaves clear or absent photos alone', () => {
    const unclear: HeaterPhoto = { id:'p1', name:'unklar.jpg', url:'blob:test', kind:'pipe-unclear', label:'Pipe type unclear', confidence:0.42, evidence:[], highlightStatus:'ready' }
    const clear: HeaterPhoto = { ...unclear, id:'p2', name:'zwei.jpg', kind:'two-pipe' }
    expect(getUnclearPhotoItem([unclear])).toMatchObject({ kind:'uncertain' })
    expect(getUnclearPhotoItem([clear])).toBeUndefined()
    expect(getUnclearPhotoItem(undefined)).toBeUndefined()
  })

  it('flags energy intensity outside the open 20–500 kWh/m² range', () => {
    const atMinimum = { ...building, annualConsumption: 2000, heatedFloorAreaM2: 100 }
    const atMaximum = { ...building, annualConsumption: 50000, heatedFloorAreaM2: 100 }
    expect(getEnergyIntensity(atMinimum)).toBe(20)
    expect(getImplausibleEnergyUseItem(atMinimum)).toBeUndefined()
    expect(getImplausibleEnergyUseItem({ ...atMinimum, annualConsumption: 1999 })).toMatchObject({ kind:'uncertain' })
    expect(getImplausibleEnergyUseItem(atMaximum)).toBeUndefined()
    expect(getImplausibleEnergyUseItem({ ...atMaximum, annualConsumption: 50001 })).toMatchObject({ kind:'uncertain' })
  })

  /** The technician gets the design-day COP that the §14a minimum power needs for the upper heat load. */
  it('asks for a §14a dimming check with the grid operator', () => {
    expect(getGridDimmingItem([6.82, 11.58], 'Bayernwerk Netz GmbH')).toMatchObject({
      kind: 'verify',
      messageKey: 'grid.dimming',
      params: { dso: 'Bayernwerk Netz GmbH', minimumKw: 4.2, loadKw: '11.6', cop: '2.8' },
    })
    expect(getGridDimmingItem([6.82, 11.58])?.messageKey).toBe('grid.dimmingNoOperator')
  })

  /** Dimming cannot limit a heat pump whose whole heat load fits into the minimum power. */
  it('skips the dimming check when the minimum power covers the heat load', () => {
    expect(getGridDimmingItem([2.1, 4.2], 'Bayernwerk Netz GmbH')).toBeUndefined()
    expect(getGridDimmingItem([2.1, 4.21], 'Bayernwerk Netz GmbH')).toMatchObject({ kind: 'verify' })
  })
})
