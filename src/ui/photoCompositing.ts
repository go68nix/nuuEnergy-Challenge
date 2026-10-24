import { PIPE_DETECTION_CONFIG } from '../core/pipeDetectionConfig'

export type PixelData = { data: Uint8ClampedArray; width: number; height: number }
export type ForegroundMask = { data: Uint8Array | Uint8ClampedArray; width: number; height: number }
export type CompositeOptions = { color?: string; opacity?: number; backgroundDim?: number }

const parseHexColor = (hex: string): [number, number, number] => {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3 ? normalized.split('').map(part => part + part).join('') : normalized
  return [0, 2, 4].map(index => Number.parseInt(full.slice(index, index + 2), 16)) as [number, number, number]
}

export const compositeForegroundHighlight = (
  image: PixelData,
  mask: ForegroundMask,
  options: CompositeOptions = {},
): PixelData => {
  const [greenR, greenG, greenB] = parseHexColor(options.color ?? PIPE_DETECTION_CONFIG.highlight.color)
  const opacity = options.opacity ?? PIPE_DETECTION_CONFIG.highlight.opacity
  const backgroundDim = options.backgroundDim ?? PIPE_DETECTION_CONFIG.highlight.backgroundDim
  const output = new Uint8ClampedArray(image.data)

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const imageIndex = (y * image.width + x) * 4
      const maskX = Math.min(mask.width - 1, Math.floor((x / image.width) * mask.width))
      const maskY = Math.min(mask.height - 1, Math.floor((y / image.height) * mask.height))
      const maskIndex = maskY * mask.width + maskX
      const foreground = (mask.data[maskIndex] / 255) * opacity
      for (let channel = 0; channel < 3; channel += 1) {
        const green = [greenR, greenG, greenB][channel]
        const dimmed = image.data[imageIndex + channel] * backgroundDim
        output[imageIndex + channel] = dimmed * (1 - foreground) + green * foreground
      }
    }
  }

  return { data: output, width: image.width, height: image.height }
}
