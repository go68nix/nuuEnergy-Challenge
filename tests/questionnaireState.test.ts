import { describe, expect, it } from 'vitest'
import { clearPipeEstimateOnChange, setEstimatedPipeAnswer, setUserPipeAnswer } from '../src/core/questionnaireState'
import { pipeTypeModule } from '../src/core/modules/pipeType'

describe('pipe questionnaire state', () => {
  it('stores an explicit user answer as user sourced', () => {
    expect(setUserPipeAnswer('single-pipe')).toEqual({ pipe_system: 'single-pipe', pipeSystemSource: 'user' })
  })

  it('stores a photo helper result as an estimate, never confirmed', () => {
    expect(setEstimatedPipeAnswer('single-pipe')).toEqual({ pipe_system: 'single-pipe', pipeSystemSource: 'estimated' })
    const result = pipeTypeModule.run({ fuelType:'gas_kwh', annualConsumption:18000, heatedFloorAreaM2:140, constructionOrRenovationYear:1970, ...setEstimatedPipeAnswer('single-pipe') }, {})
    expect(result.data).toMatchObject({ pipe_system:'single-pipe', source:'estimated', confirmed:false })
  })

  it('stores unknown as unknown regardless of the path', () => {
    expect(setUserPipeAnswer('unknown')).toEqual({ pipe_system: 'unknown', pipeSystemSource: 'unknown' })
    expect(setEstimatedPipeAnswer('unknown')).toEqual({ pipe_system: 'unknown', pipeSystemSource: 'unknown' })
  })

  it('clears an earlier estimate when the user changes the answer', () => {
    expect(clearPipeEstimateOnChange(setEstimatedPipeAnswer('single-pipe'), 'two-pipe')).toEqual({ pipe_system: 'two-pipe', pipeSystemSource: 'user' })
  })
})
