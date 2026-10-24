import { describe, expect, it } from 'vitest'
import { operatingCostModule } from '../src/core/modules/operatingCost'

describe('operatingCostModule', () => {
  it('uses fixed prices and default JAZ model', () => {
    const result = operatingCostModule.run(
      {
        fuelType: 'gas_kwh',
        annualConsumption: 12000,
        occupants: 2,
        constructionOrRenovationYear: 2010,
        heatedFloorAreaM2: 130,
      },
      {},
    )

    expect(result.data).toMatchObject({
      jaz: 3.5,
      currentCostEur: 1320,
      estimatedHeatPumpCostEur: 784.4571428571429,
      annualSavingsEur: 535.5428571428571,
    })
  })

  it('accepts custom JAZ from context', () => {
    const result = operatingCostModule.run(
      {
        fuelType: 'heating_oil_l',
        annualConsumption: 2500,
        occupants: 2,
        constructionOrRenovationYear: 1988,
        heatedFloorAreaM2: 170,
      },
      { jaz: 4.0 },
    )

    expect(result.data).toMatchObject({
      jaz: 4.0,
      currentCostEur: 4250,
      estimatedHeatPumpCostEur: 1430,
    })
  })
})
