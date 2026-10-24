import { describe, expect, it } from 'vitest'
import { buildChatContext } from '../src/chat/buildChatContext'
import { parseSseText, splitSseBuffer } from '../src/server/stream'
import { chatRequestSchema } from '../src/server/chatValidation'
import { createRateLimiter } from '../src/server/rateLimit'
import { buildProviderMessages, friendlyError, LlmProviderError } from '../src/server/llm'
import { readTextStream } from '../src/chat/clientStream'
import type { AssessmentResult } from '../src/core/types'

const result: AssessmentResult = {
  building: { fuelType: 'gas_kwh', annualConsumption: 12000, constructionOrRenovationYear: 1990, heatedFloorAreaM2: 120, pipe_system: 'two-pipe', pipeSystemSource: 'user', pipeSystemEvidence: ['Separate supply and return pipes'] },
  photos: [{ id: 'photo', name: 'x', url: 'secret-photo-url', kind: 'two-pipe', label: 'Two-pipe', confidence: .9, evidence: ['Separate supply and return pipes'], highlightStatus: 'ready' }],
  modules: [{ id: 'traffic_light', label: 'Traffic', status: 'ok', data: { level: 'yellow' } }, { id: 'pipe_type', label: 'Pipe', status: 'ok', data: { source: 'user', pipe_system: 'two-pipe' }, reportItems: [{ kind: 'verify', text: 'Check pipe', reason: 'Need site check', priority: 'high' }] }],
}

describe('chat helpers', () => {
  it('builds compact context with sources and excludes photo data', () => {
    const context = buildChatContext(result)
    expect(context.questionnaire.pipe_system.source).toBe('provided')
    expect(context.verdict.level).toBe('yellow')
    expect(context.checks.verify).toContain('Check pipe')
    expect(JSON.stringify(context)).not.toContain('secret-photo-url')
  })
  it('handles an absent assessment', () => expect(buildChatContext(null)).toMatchObject({ questionnaire: {}, modules: [] }))
  it('validates message count, length, and roles', () => {
    expect(chatRequestSchema.safeParse({ messages: Array.from({ length: 21 }, () => ({ role: 'user', content: 'x' })), context: {} }).success).toBe(false)
    expect(chatRequestSchema.safeParse({ messages: [{ role: 'user', content: 'x'.repeat(2001) }], context: {} }).success).toBe(false)
    expect(chatRequestSchema.safeParse({ messages: [{ role: 'system', content: 'x' }], context: {} }).success).toBe(false)
  })
  it('limits requests per IP', () => { const allow = createRateLimiter(2, 1000); expect(allow('a')).toBe(true); expect(allow('a')).toBe(true); expect(allow('a')).toBe(false) })
  it('parses split SSE lines and DONE', () => { const first = splitSseBuffer('data: {"choices":[{"delta":{"content":"hel'); expect(first.remainder).toContain('hel'); const parsed = parseSseText('data: {"choices":[{"delta":{"content":"lo"}}]}\ndata: [DONE]\n'); expect(parsed).toEqual({ text: 'lo', done: true }) })
  it('builds provider messages with context after the system prompt', () => { const messages = buildProviderMessages({ messages: [{ role: 'user', content: 'Hi' }], context: { level: 'yellow' } }); expect(messages[0].role).toBe('system'); expect(messages[0].content).toContain('"level":"yellow"'); expect(messages[1]).toEqual({ role: 'user', content: 'Hi' }) })
  it('maps provider errors to friendly messages', () => { expect(friendlyError(new LlmProviderError(429, 'busy'))).toContain('busy right now'); expect(friendlyError(new Error('network'))).toContain('offline right now') })
  it('forwards client stream chunks as they arrive', async () => { const chunks = [new TextEncoder().encode('hel'), new TextEncoder().encode('lo')]; const response = new Response(new ReadableStream({ start(controller) { chunks.forEach(chunk => controller.enqueue(chunk)); controller.close() } })); const output: string[] = []; await readTextStream(response, text => output.push(text)); expect(output.join('')).toBe('hello') })
})
