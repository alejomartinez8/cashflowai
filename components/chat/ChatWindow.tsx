'use client'

import { useEffect, useRef } from 'react'
import type { UIMessage } from 'ai'
import MessageBubble from './MessageBubble'

interface Props {
  messages: UIMessage[]
  status: string
}

const TypingIndicator = () => (
  <div className="flex justify-start gap-3 items-start">
    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>
      </svg>
    </div>
    <div
      className="rounded-2xl rounded-tl-sm px-4 py-3 border border-border"
      style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}
    >
      <div className="flex gap-1.5 items-center h-4">
        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
      </div>
    </div>
  </div>
)

export default function ChatWindow({ messages, status }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-5">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
