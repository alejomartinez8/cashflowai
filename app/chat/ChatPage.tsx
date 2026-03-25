'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@/hooks/use-chat'
import ChatWindow from '@/components/chat/ChatWindow'
import QuickPrompts from '@/components/chat/QuickPrompts'
import { cn } from '@/lib/utils'
import { getSuggestions } from './actions'
import type { Suggestion } from '@/lib/types'

export default function ChatPage({ userId }: { userId: string }) {
  const { messages, input, setInput, sendMessage, status, stop, clear, contextPct } = useChat({ userId })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isStreaming = status === 'submitted' || status === 'streaming'
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [suggestionsLoading, setSuggestionsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getSuggestions()
      .then((data) => { if (!cancelled) setSuggestions(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSuggestionsLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSend() {
    const text = input.trim()
    if (!text || isStreaming) return
    sendMessage(text)
    setInput('')
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-background">
      {/* Main content area */}
      {isEmpty ? (
        <div className="flex flex-col flex-1 items-center justify-end pb-2 w-full overflow-y-auto">
          <div className="mb-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">¿En qué trabajamos hoy?</h2>
            <p className="text-sm text-muted-foreground mt-1">Tu coach financiero personal</p>
          </div>
        </div>
      ) : (
        <ChatWindow messages={messages} status={status} />
      )}

      {/* Bottom input area */}
      <div className="border-t border-border bg-card px-4 pt-2 pb-3">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Compact suggestions — always visible */}
          <QuickPrompts compact onSelect={(p) => sendMessage(p)} suggestions={suggestions} isLoading={suggestionsLoading} />

          {/* Input row */}
          <div
            className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 transition-shadow focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
            style={{ boxShadow: 'var(--shadow-md)' }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta sobre tus finanzas..."
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none overflow-y-auto leading-5 self-center"
            />
            {isStreaming ? (
              <button
                onClick={stop}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                </svg>
                Detener
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-all active:scale-95 shadow-sm"
                aria-label="Enviar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
                </svg>
              </button>
            )}
          </div>

          <div className="flex justify-between items-center px-1">
            <p className="text-xs text-muted-foreground/60">Enter para enviar · Shift+Enter para nueva línea</p>
            <div className="flex items-center gap-3">
              {contextPct > 0 && (
                <span
                  className={cn(
                    'text-xs font-mono',
                    contextPct >= 80
                      ? 'text-red-500'
                      : contextPct >= 50
                        ? 'text-yellow-500'
                        : 'text-muted-foreground/60',
                  )}
                  title="Estimated context window usage"
                >
                  ctx {contextPct}%
                </span>
              )}
              {messages.length > 0 && (
                <button
                  onClick={clear}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Limpiar conversación
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
