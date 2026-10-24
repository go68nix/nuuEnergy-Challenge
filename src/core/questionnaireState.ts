import type { BuildingInput } from './types'

export type PipeAnswer = Pick<BuildingInput, 'pipe_system' | 'pipeSystemSource'>

export const setUserPipeAnswer = (pipe_system: 'two-pipe' | 'single-pipe' | 'unknown'): PipeAnswer => ({
  pipe_system,
  pipeSystemSource: pipe_system === 'unknown' ? 'unknown' : 'user',
})

export const setEstimatedPipeAnswer = (pipe_system: 'two-pipe' | 'single-pipe' | 'unknown'): PipeAnswer => ({
  pipe_system,
  pipeSystemSource: pipe_system === 'unknown' ? 'unknown' : 'estimated',
})

export const clearPipeEstimateOnChange = (current: PipeAnswer, next: 'two-pipe' | 'single-pipe' | 'unknown'): PipeAnswer => {
  if (current.pipe_system === next && current.pipeSystemSource !== 'estimated') return current
  return setUserPipeAnswer(next)
}

export const estimatePipeSystemFromBuildingYear = (year: number): { pipe_system: 'two-pipe' | 'single-pipe' | 'unknown'; riskLevel: 'low' | 'medium' | 'high'; basis: string } => {
  if (year < 1980) return { pipe_system: 'single-pipe', riskLevel: 'high', basis: `Homes built before 1980 are more likely to have single-pipe heating. Building year entered: ${year}.` }
  if (year <= 1995) return { pipe_system: 'unknown', riskLevel: 'medium', basis: `The building year (${year}) does not clearly indicate a pipe type.` }
  return { pipe_system: 'two-pipe', riskLevel: 'low', basis: `Homes built after 1995 are more likely to have two-pipe heating. Building year entered: ${year}.` }
}
