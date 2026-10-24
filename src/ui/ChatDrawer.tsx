import { useEffect, useRef, useState, type RefObject } from 'react'
import { buildChatContext } from '../chat/buildChatContext'
import { readTextStream } from '../chat/clientStream'
import { REPORT_LOCALES } from '../core/reportLocales'
import type { AssessmentResult } from '../core/types'

type Message = { role: 'user' | 'assistant'; content: string }
type Props = { open: boolean; onClose: () => void; assessment: AssessmentResult | null; hasResults: boolean; launcherRef: RefObject<HTMLButtonElement | null> }

export const ChatDrawer = ({ open, onClose, assessment, hasResults, launcherRef }: Props) => {
  const locale = REPORT_LOCALES.en.chat
  const inputRef = useRef<HTMLInputElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    if (!open) {
      launcherRef.current?.focus()
      return
    }
    inputRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    void fetch('/api/health/llm').then(response => response.json() as Promise<{ ok: boolean }>).then(data => setOffline(!data.ok)).catch(() => setOffline(true))
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, launcherRef])
  const send = async (content = draft) => {
    const text = content.trim()
    if (!text || busy) return
    const next = [...messages, { role: 'user' as const, content: text }]
    setMessages([...next, { role: 'assistant', content: '' }])
    setDraft('')
    setError('')
    setBusy(true)
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next.slice(-20), context: buildChatContext(assessment) }) })
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? 'The assistant is offline right now, please try again later')
      }
      await readTextStream(response, textChunk => setMessages(current => current.map((message, index) => index === current.length - 1 ? { ...message, content: message.content + textChunk } : message)))
    } catch (caught) {
      setMessages(next)
      setError(caught instanceof Error ? caught.message : 'The assistant is offline right now, please try again later')
    } finally { setBusy(false) }
  }
  const suggestions = hasResults ? locale.resultsSuggestions : locale.suggestions
  return <aside className={`chat-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open} aria-label={locale.title}>
    <div className="chat-header"><strong>{locale.title}</strong><div><button type="button" onClick={() => { setMessages([]); setError('') }}>{locale.newChat}</button><button type="button" aria-label={locale.close} onClick={onClose}>×</button></div></div>
    <div className="chat-messages" aria-live="polite">
      {messages.length === 0 && <div className="chat-welcome"><p>{locale.welcome}</p><div className="chat-suggestions">{suggestions.map(suggestion => <button type="button" key={suggestion} onClick={() => void send(suggestion)}>{suggestion}</button>)}</div></div>}
      {messages.map((message, index) => <div className={`chat-message chat-${message.role}`} key={`${message.role}-${index}`}>{message.content || (busy && index === messages.length - 1 ? <span className="chat-typing">{locale.typing}</span> : '')}</div>)}
      {offline && <small className="chat-offline">{locale.assistantOffline}</small>}
      {error && <div className="chat-error" role="alert"><span>{error}</span><button type="button" onClick={() => void send(messages.at(-1)?.role === 'user' ? messages.at(-1)?.content : '')}>{locale.retry}</button></div>}
    </div>
    <form className="chat-form" onSubmit={event => { event.preventDefault(); void send() }}><input ref={inputRef} value={draft} onChange={event => setDraft(event.target.value)} placeholder={locale.inputPlaceholder} aria-label={locale.inputPlaceholder} disabled={busy} /><button type="submit" disabled={busy || !draft.trim()}>{locale.send}</button></form>
  </aside>
}
