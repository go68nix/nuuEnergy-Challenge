import type { RefObject } from 'react'

export const ChatLauncher = ({ onClick, buttonRef }: { onClick: () => void; buttonRef: RefObject<HTMLButtonElement | null> }) => (
  <button ref={buttonRef} className="chat-launcher" type="button" aria-label="Open assessment helper" onClick={onClick}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.8 4v-4.1a2.5 2.5 0 0 1-2.2-2.4v-7Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M8 8.5h8M8 11.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  </button>
)
