export type PipeDetectionKind = 'pipe-unclear' | 'two-pipe' | 'single-pipe' | 'not-heater'

export const PIPE_DETECTION_CONFIG: {
  rules: { prefix: string; kind: PipeDetectionKind }[]
  results: Record<PipeDetectionKind, { label: string; confidence: number; evidence: string[] }>
  backgroundModel: string
  backgroundModelDtype: 'q8'
  highlight: { color: string; opacity: number; backgroundDim: number; maxSide: number }
} = {
  rules: [
    { prefix: 'unklar', kind: 'pipe-unclear' },
    { prefix: 'zwei', kind: 'two-pipe' },
    { prefix: 'ein', kind: 'single-pipe' },
  ],
  results: {
    'single-pipe': { label: 'Likely single-pipe', confidence: 0.87, evidence: ['Bypass piece between the pipes at the radiator', 'Flow continues through the radiator branch'] },
    'two-pipe': { label: 'Two-pipe · low risk', confidence: 0.91, evidence: ['Separate supply and return pipes', 'Independent flow path to the radiator'] },
    'pipe-unclear': { label: 'Pipe type unclear', confidence: 0.42, evidence: ['Pipe connections are visible', 'The system type cannot be distinguished clearly'] },
    'not-heater': { label: 'Not a heater', confidence: 0.95, evidence: ['No recognizable heater or radiator connection'] },
  },
  backgroundModel: 'briaai/RMBG-1.4',
  backgroundModelDtype: 'q8',
  highlight: { color: '#22c55e', opacity: 0.45, backgroundDim: 0.84, maxSide: 1024 },
}
