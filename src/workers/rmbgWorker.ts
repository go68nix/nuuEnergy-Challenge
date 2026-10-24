/// <reference lib="webworker" />
import { AutoConfig, pipeline, RawImage } from '@huggingface/transformers'
import { PIPE_DETECTION_CONFIG } from '../core/pipeDetectionConfig'

type RequestMessage = { id: number; file: Blob }
type ResponseMessage = { id: number; type: 'loading' | 'processing' | 'mask' | 'failed'; width?: number; height?: number; mask?: Uint8Array }

let segmenter: Awaited<ReturnType<typeof pipeline<'image-segmentation'>>> | undefined
const scope = self as DedicatedWorkerGlobalScope
let queue: Promise<void> = Promise.resolve()

const processPhoto = async ({ id, file }: RequestMessage) => {
  try {
    if (!segmenter) {
      scope.postMessage({ id, type: 'loading' } satisfies ResponseMessage)
      const model = PIPE_DETECTION_CONFIG.backgroundModel
      const configResponse = await fetch(`https://huggingface.co/${model}/resolve/main/config.json`)
      if (!configResponse.ok) throw new Error(`Unable to fetch model config: ${configResponse.status}`)
      const configJson = await configResponse.json()
      // The Hub config uses a custom model_type; map it to the Transformers.js Segformer implementation.
      configJson.model_type = 'segformer'
      configJson.architectures = ['SegformerForSemanticSegmentation']
      const config = await AutoConfig.from_pretrained(model, { config: configJson })
      segmenter = await pipeline('image-segmentation', model, { config, dtype: PIPE_DETECTION_CONFIG.backgroundModelDtype })
    }
    scope.postMessage({ id, type: 'processing' } satisfies ResponseMessage)

    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, PIPE_DETECTION_CONFIG.highlight.maxSide / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Unable to create image canvas')
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const pixels = context.getImageData(0, 0, width, height)
    const rawImage = new RawImage(pixels.data, width, height, 4)
    const output = await segmenter(rawImage)
    const foregroundMask = output[0]?.mask
    if (!foregroundMask) throw new Error('The segmentation model returned no mask')
    const mask = new Uint8Array(foregroundMask.width * foregroundMask.height)
    const channels = foregroundMask.channels
    for (let i = 0; i < mask.length; i += 1) {
      mask[i] = foregroundMask.data[i * channels]
    }
    const response: ResponseMessage = { id, type: 'mask', width: foregroundMask.width, height: foregroundMask.height, mask }
    scope.postMessage(response, [mask.buffer])
  } catch (error) {
    console.warn('Local heater photo highlight failed', error)
    scope.postMessage({ id, type: 'failed' } satisfies ResponseMessage)
  }
}

scope.onmessage = (event: MessageEvent<RequestMessage>) => {
  queue = queue.then(() => processPhoto(event.data))
}
