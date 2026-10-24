import { describe, expect, it } from 'vitest'
import { compositeForegroundHighlight } from '../src/ui/photoCompositing'

describe('foreground photo compositing', () => {
  it('tints the foreground green and dims the background without changing dimensions', () => {
    const image = { width: 2, height: 1, data: new Uint8ClampedArray([100, 100, 100, 255, 100, 100, 100, 255]) }
    const mask = { width: 2, height: 1, data: new Uint8Array([255, 0]) }
    const result = compositeForegroundHighlight(image, mask, { color:'#22c55e', opacity:0.45, backgroundDim:0.84 })

    expect(result.width).toBe(2)
    expect(result.height).toBe(1)
    expect(result.data[1]).toBeGreaterThan(result.data[0])
    expect(result.data[4]).toBe(84)
    expect(result.data[5]).toBe(84)
    expect(result.data[7]).toBe(255)
  })
})
