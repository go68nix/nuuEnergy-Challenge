import { PIPE_DETECTION_CONFIG } from '../core/pipeDetectionConfig'

export type WorkerMask = { data: Uint8Array; width: number; height: number }
type WorkerReply = { id: number; type: 'loading' | 'processing' | 'mask' | 'failed'; width?: number; height?: number; mask?: Uint8Array }
type Pending = { resolve: (value: WorkerMask | null) => void; onStage: (stage: 'loading' | 'processing') => void }

let worker: Worker | undefined
let nextId = 1
const pending = new Map<number, Pending>()

const getWorker = () => {
  if (worker) return worker
  worker = new Worker(new URL('../workers/rmbgWorker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (event: MessageEvent<WorkerReply>) => {
    const reply = event.data
    const request = pending.get(reply.id)
    if (!request) return
    if (reply.type === 'loading' || reply.type === 'processing') {
      request.onStage(reply.type)
      return
    }
    pending.delete(reply.id)
    request.resolve(reply.type === 'mask' && reply.mask && reply.width && reply.height ? { data: reply.mask, width: reply.width, height: reply.height } : null)
  }
  worker.onerror = () => {
    for (const request of pending.values()) request.resolve(null)
    pending.clear()
    worker?.terminate()
    worker = undefined
  }
  return worker
}

export const createForegroundMask = (file: File, onStage: (stage: 'loading' | 'processing') => void = () => undefined): Promise<WorkerMask | null> => {
  const id = nextId++
  return new Promise(resolve => {
    pending.set(id, { resolve, onStage })
    getWorker().postMessage({ id, file, maxSide: PIPE_DETECTION_CONFIG.highlight.maxSide })
  })
}
