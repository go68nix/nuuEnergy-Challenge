import { CHAT_SYSTEM_PROMPT } from '../chat/systemPrompt'
import type { ChatRequest } from './chatValidation'

export const friendlyError = (error: unknown) => {
  if (error instanceof LlmProviderError && error.status === 429) return 'The assistant is busy right now, please try again in a minute'
  return 'The assistant is offline right now, please try again later'
}

export class LlmProviderError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const buildProviderMessages = (request: ChatRequest) => [
  { role: 'system' as const, content: `${CHAT_SYSTEM_PROMPT}\n${JSON.stringify(request.context)}` },
  ...request.messages,
]

export const requestLlm = async (request: ChatRequest, env: { baseUrl: string; model: string; apiKey: string; timeoutMs: number }, fetcher: typeof fetch = fetch) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), env.timeoutMs)
  try {
    const response = await fetcher(`${env.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: env.model, messages: buildProviderMessages(request), stream: true, max_tokens: 600 }),
      signal: controller.signal,
    })
    if (!response.ok) throw new LlmProviderError(response.status, `Provider returned ${response.status}`)
    if (!response.body) throw new Error('Provider returned no stream')
    return response.body
  } finally {
    clearTimeout(timer)
  }
}
