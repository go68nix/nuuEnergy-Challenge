import { z } from 'zod'

export const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(2000),
  })).max(20),
  context: z.record(z.string(), z.unknown()),
}).strict()

export type ChatRequest = z.infer<typeof chatRequestSchema>

export const MAX_BODY_BYTES = 100 * 1024
