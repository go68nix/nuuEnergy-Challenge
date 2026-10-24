import 'dotenv/config'
import { requestLlm } from '../src/server/llm'
import { parseSseText } from '../src/server/stream'

if (!process.env.LLM_API_KEY) {
  console.error('LLM_API_KEY is missing. Copy .env.example to .env and add your key.')
  process.exit(1)
}
try {
  const body = await requestLlm({ messages: [{ role: 'user', content: 'Say hello in one short sentence.' }], context: {} }, { baseUrl: process.env.LLM_BASE_URL ?? '', model: process.env.LLM_MODEL ?? '', apiKey: process.env.LLM_API_KEY, timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 60000) })
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let reply = ''
  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const result = parseSseText(buffer)
    reply += result.text
    buffer = ''
    if (done || result.done) break
  }
  console.log(reply.trim())
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
