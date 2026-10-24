import { PIPE_DETECTION_CONFIG, type PipeDetectionKind } from './pipeDetectionConfig'

export type PipeDetection = { kind: PipeDetectionKind; confidence: number; evidence: string[] }

export interface PipeDetector {
  analyze(file: File): Promise<PipeDetection>
}

// Stand-in for a future image classifier: current deterministic results use the uploaded file name.
export const filenamePipeDetector: PipeDetector = {
  async analyze(file) {
    const baseName = file.name.toLowerCase().replace(/\.[^.]*$/, '')
    const match = PIPE_DETECTION_CONFIG.rules.find(rule => baseName.startsWith(rule.prefix))
    const kind = match?.kind ?? 'not-heater'
    const { confidence, evidence } = PIPE_DETECTION_CONFIG.results[kind]
    return { kind, confidence, evidence }
  },
}
