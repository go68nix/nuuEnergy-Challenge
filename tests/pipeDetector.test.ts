import { describe, expect, it } from 'vitest'
import { filenamePipeDetector } from '../src/core/pipeDetector'

const file = (name: string) => new File(['photo'], name, { type: 'image/jpeg' })

describe('filename pipe detector', () => {
  it.each([
    ['unklar.jpg', 'pipe-unclear'],
    ['zwei.jpg', 'two-pipe'],
    ['ein.jpg', 'single-pipe'],
    ['UNKLAR_EIN.jpg', 'pipe-unclear'],
    ['ZWEI.HEIC', 'two-pipe'],
    ['EIN.PNG', 'single-pipe'],
    ['heizkoerper.jpg', 'not-heater'],
  ] as const)('detects %s as %s', async (name, kind) => {
    await expect(filenamePipeDetector.analyze(file(name))).resolves.toMatchObject({ kind })
  })
})
