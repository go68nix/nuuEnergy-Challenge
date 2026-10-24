export type ChatChunk = { choices?: Array<{ delta?: { content?: string } }> }

export const parseSseText = (input: string): { text: string; done: boolean } => {
  let text = ''
  let done = false
  for (const line of input.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue
    const data = line.slice(5).trim()
    if (data === '[DONE]') {
      done = true
      continue
    }
    try {
      const chunk = JSON.parse(data) as ChatChunk
      text += chunk.choices?.[0]?.delta?.content ?? ''
    } catch {
      // Incomplete lines are retained by the stream reader and parsed on the next read.
    }
  }
  return { text, done }
}

export const splitSseBuffer = (buffer: string): { lines: string[]; remainder: string } => {
  const parts = buffer.split(/\r?\n/)
  return { lines: parts.slice(0, -1), remainder: parts.at(-1) ?? '' }
}
