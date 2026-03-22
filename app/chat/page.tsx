'use client'

import { useEffect, useRef } from 'react'
import { useChat } from '@/hooks/use-chat'
import ChatWindow from '@/components/chat/ChatWindow'
import QuickPrompts from '@/components/chat/QuickPrompts'

export default function ChatPage() {
  const { messages, input, setInput, sendMessage, status, stop, clear } = useChat()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isStreaming = status === 'submitted' || status === 'streaming'

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

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-background">
      {messages.length === 0 ? (
        <div className="flex flex-col flex-1 justify-end">
          <div className="px-4 pb-4 max-w-3xl mx-auto w-full text-center">
            <p className="text-muted-foreground text-sm">¿En qué te puedo ayudar hoy?</p>
          </div>
          <QuickPrompts onSelect={(p) => { sendMessage(p) }} />
        </div>
      ) : (
        <ChatWindow messages={messages} status={status} />
      )}

      <div className="border-t border-border bg-card px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring/50 transition-shadow">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta sobre tus finanzas..."
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none overflow-y-auto"
            />
            <div className="flex items-center gap-1.5 pb-0.5">
              {isStreaming ? (
                <button
                  onClick={stop}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="1"/>
                  </svg>
                  Detener
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-opacity"
                  aria-label="Enviar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
          {messages.length > 0 && (
            <div className="flex justify-end mt-1.5">
              <button
                onClick={clear}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Limpiar conversación
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
