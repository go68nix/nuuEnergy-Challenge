import 'dotenv/config'
import express from 'express'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { chatRequestSchema, MAX_BODY_BYTES } from './chatValidation'
import { friendlyError, requestLlm } from './llm'
import { createRateLimiter } from './rateLimit'
import { parseSseText, splitSseBuffer } from './stream'

const port = Number(process.env.PORT ?? 8787)
const apiKey = process.env.LLM_API_KEY
if (!apiKey) console.warn('LLM_API_KEY is missing: /api/chat will return a clear configuration error until it is set.')
const limiter = createRateLimiter()
const app = express()
app.use(express.json({ limit: MAX_BODY_BYTES }))
app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error && typeof error === 'object' && 'type' in error && error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Chat request is too large.' })
  }
  next(error)
})

app.post('/api/chat', async (req, res) => {
  if (!apiKey) return res.status(503).json({ error: 'Chat assistant is not configured. Add LLM_API_KEY to .env and restart the server.' })
  if (!limiter(req.ip ?? 'unknown')) return res.status(429).json({ error: 'Too many chat requests. Please try again in a few minutes.' })
  const parsed = chatRequestSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid chat request.' })
  try {
    const body = await requestLlm(parsed.data, { baseUrl: process.env.LLM_BASE_URL ?? '', model: process.env.LLM_MODEL ?? '', apiKey, timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 60000) })
    res.status(200).set({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      const split = splitSseBuffer(buffer)
      buffer = split.remainder
      const parsedLines = parseSseText(`${split.lines.join('\n')}\n`)
      if (parsedLines.text) res.write(parsedLines.text)
      if (done || parsedLines.done) break
    }
    res.end()
  } catch (error) {
    console.error('LLM request failed:', error)
    if (!res.headersSent) res.status(error instanceof Error && error.message.includes('configured') ? 503 : error instanceof Error && 'status' in error && (error as { status?: number }).status === 429 ? 429 : 503).json({ error: friendlyError(error) })
    else res.end()
  }
})

app.get('/api/health/llm', async (_req, res) => {
  if (!apiKey) return res.json({ ok: false, status: 'unavailable' })
  try {
    const body = await requestLlm({ messages: [{ role: 'user', content: 'Reply with OK.' }], context: {} }, { baseUrl: process.env.LLM_BASE_URL ?? '', model: process.env.LLM_MODEL ?? '', apiKey, timeoutMs: Math.min(Number(process.env.LLM_TIMEOUT_MS ?? 60000), 10000) })
    await body.cancel()
    res.json({ ok: true, status: 'ok' })
  } catch (error) {
    console.error('LLM health check failed:', error)
    res.json({ ok: false, status: 'unavailable' })
  }
})

const dist = path.resolve(process.cwd(), 'dist')
if (existsSync(dist)) app.use(express.static(dist))
app.listen(port, () => console.log(`nuuEnergy server listening on http://localhost:${port}`))
