import { compositeForegroundHighlight } from './photoCompositing'
import type { WorkerMask } from './localHighlightWorker'

export const createHighlightedPhoto = async (file: File, mask: WorkerMask): Promise<string> => {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Unable to draw photo')
  context.drawImage(bitmap, 0, 0)
  bitmap.close()
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  const highlighted = compositeForegroundHighlight(pixels, mask)
  const highlightedPixels = new ImageData(highlighted.width, highlighted.height)
  highlightedPixels.data.set(highlighted.data)
  context.putImageData(highlightedPixels, 0, 0)
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Unable to encode photo')), 'image/png'))
  return URL.createObjectURL(blob)
}
