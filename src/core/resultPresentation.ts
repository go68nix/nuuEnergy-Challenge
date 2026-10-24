import type { AssessmentResult, ModuleResult, TrafficLight } from './types'

export type DecidingFactor = {
  id: string
  label: string
  tone: 'helping' | 'hurting' | 'neutral'
  icon: 'check' | 'warning' | 'dot'
}

export const verdictHeadline = (level: TrafficLight, locale: Record<TrafficLight, string>) => locale[level]

export const chooseDecidingFactors = (assessment: AssessmentResult): DecidingFactor[] => {
  const module = (id: string) => assessment.modules.find(item => item.id === id)
  const factors: DecidingFactor[] = []
  const traffic = module('traffic_light')?.data as { level?: TrafficLight } | undefined
  const heating = module('heating_load')?.data as { rangeKw?: [number, number] } | undefined
  const pipe = module('pipe_type')?.data as { pipe_system?: string; source?: string } | undefined
  const distribution = assessment.building.heatingDistribution

  if (distribution === 'underfloor') factors.push({ id: 'underfloor', label: 'Underfloor heating', tone: 'helping', icon: 'check' })
  if (heating?.rangeKw && heating.rangeKw[1] <= 15) factors.push({ id: 'load', label: 'Moderate heating load', tone: 'helping', icon: 'check' })
  if (pipe?.pipe_system === 'two-pipe' && pipe.source === 'user') factors.push({ id: 'two-pipe', label: 'Confirmed two-pipe system', tone: 'helping', icon: 'check' })
  if (pipe?.pipe_system === 'single-pipe') factors.push({ id: 'single-pipe', label: 'Single-pipe system', tone: 'hurting', icon: 'warning' })
  if (pipe?.source !== 'user' || pipe?.pipe_system === 'unknown') factors.push({ id: 'pipe-unknown', label: 'Pipe system needs checking', tone: 'hurting', icon: 'warning' })
  if (traffic?.level === 'red' && factors.length === 0) factors.push({ id: 'review', label: 'High-priority checks needed', tone: 'hurting', icon: 'warning' })
  return factors.slice(0, 3)
}

export const rangePosition = (value: number, min: number, max: number) =>
  max <= min ? 0 : Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))

export const costDifferenceWording = (difference: number) => {
  if (Math.abs(difference) < 25) return 'Roughly equal running costs'
  return difference > 0
    ? `Estimated saving of €${Math.round(difference).toLocaleString()} per year`
    : `Estimated extra cost of €${Math.round(Math.abs(difference)).toLocaleString()} per year`
}

export const confidenceLabel = (source: 'provided' | 'estimated' | 'unknown') =>
  source === 'provided' ? 'provided' : source === 'estimated' ? 'estimate' : 'unknown'

export const getModule = (assessment: AssessmentResult, id: string): ModuleResult | undefined =>
  assessment.modules.find(module => module.id === id)
