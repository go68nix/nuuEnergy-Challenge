export const readTextStream = async (response: Response, onText: (text: string) => void) => {
  if (!response.body) throw new Error('The assistant is offline right now, please try again later')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let pending = ''
  while (true) {
    const { done, value } = await reader.read()
    pending += decoder.decode(value, { stream: !done })
    if (pending) {
      onText(pending)
      pending = ''
    }
    if (done) break
  }
}
