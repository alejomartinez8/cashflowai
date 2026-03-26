'use client'

import { useEffect, useState, useCallback } from 'react'
import { useChat } from '@/hooks/use-chat'
import { useConversations } from '@/hooks/use-conversations'
import ChatWindow from '@/components/chat/ChatWindow'
import QuickPrompts from '@/components/chat/QuickPrompts'
import ConversationSidebar from '@/components/chat/ConversationSidebar'
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputFooter,
} from '@/components/ai-elements/prompt-input'
import { cn } from '@/lib/utils'
import { getSuggestions } from './actions'
import type { Suggestion } from '@/lib/types'
import { useBranchStore } from '@/hooks/use-branch-store'

import type { ConversationSummary } from '@/hooks/use-conversations'

interface ChatPageProps {
  initialConversations: ConversationSummary[]
}

export default function ChatPage({ initialConversations }: ChatPageProps) {
  const {
    conversationList,
    currentId,
    refresh,
    loadConversation,
    startNew,
    onConversationIdChange,
  } = useConversations(initialConversations)

  const onConversationSaved = useCallback(() => {
    refresh()
  }, [refresh])

  const { messages, sendMessage, status, stop, clear, contextPct, reload, setMessages } = useChat({
    conversationId: currentId,
    initialMessages: [],
    onConversationIdChange,
    onConversationSaved,
  })

  const isStreaming = status === 'submitted' || status === 'streaming'
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [suggestionsLoading, setSuggestionsLoading] = useState(true)
  const [loadingConversation, setLoadingConversation] = useState(false)

  const branchStore = useBranchStore({ messages, status, reload, setMessages })

  useEffect(() => {
    let cancelled = false
    getSuggestions()
      .then((data) => { if (!cancelled) setSuggestions(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSuggestionsLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Select a conversation: load from DB and set messages directly (no effect needed)
  const handleSelectConversation = useCallback(async (id: string) => {
    if (id === currentId) return
    setLoadingConversation(true)
    try {
      const conv = await loadConversation(id)
      if (conv) {
        onConversationIdChange(conv.id)
        setMessages(conv.messages)
        branchStore.clearBranches()
      }
    } catch {
      // silent
    } finally {
      setLoadingConversation(false)
    }
  }, [currentId, loadConversation, onConversationIdChange, setMessages, branchStore])

  function handleSend() {
    const text = input.trim()
    if (!text || isStreaming) return
    branchStore.clearBranches()
    sendMessage(text)
    setInput('')
  }

  function handleClear() {
    branchStore.clearBranches()
    clear()
    startNew()
    refresh()
  }

  function handleEditMessage(messageId: string, newText: string) {
    const idx = messages.findIndex((m) => m.id === messageId)
    if (idx === -1) return
    setMessages(messages.slice(0, idx))
    branchStore.clearBranches()
    sendMessage(newText)
  }

  function handleNewConversation() {
    branchStore.clearBranches()
    setMessages([])
    startNew()
  }

  const isEmpty = messages.length === 0

  if (loadingConversation) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden bg-background">
        <ConversationSidebar
          conversations={conversationList}
          currentId={currentId}
          onSelect={handleSelectConversation}
          onNew={handleNewConversation}
          onRefresh={refresh}
        />
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-pulse text-muted-foreground text-sm">Cargando conversación...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-background">
      <ConversationSidebar
        conversations={conversationList}
        currentId={currentId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
        onRefresh={refresh}
      />

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
        <ChatWindow messages={messages} status={status} branchStore={branchStore} onEdit={handleEditMessage} />
      )}

      {/* Bottom input area */}
      <div className="border-t border-border bg-card px-4 pt-2 pb-3">
        <PromptInput
          onSubmit={handleSend}
          status={status}
          onStop={stop}
          className="max-w-3xl mx-auto"
        >
          {/* Compact suggestions — always visible above the input */}
          <QuickPrompts
            compact
            onSelect={(p) => sendMessage(p)}
            suggestions={suggestions}
            isLoading={suggestionsLoading}
          />

          {/* Input row */}
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta sobre tus finanzas..."
            />
            <PromptInputSubmit disabled={!input.trim()} />
          </PromptInputBody>

          {/* Footer: hint text + context % + clear */}
          <PromptInputFooter>
            <p className="text-xs text-muted-foreground/60">
              Enter para enviar · Shift+Enter para nueva línea
            </p>
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
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Limpiar conversación
                </button>
              )}
            </div>
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}
