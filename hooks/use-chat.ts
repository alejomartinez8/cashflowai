'use client'

import { useChat as useAiChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useState, useRef, useCallback } from 'react'
import type { UIMessage } from 'ai'
import { toast } from 'sonner'
import { useModelPreference } from './use-model-preference'
import { saveConversation } from '@/app/chat/conversation-actions'

function estimateTokens(messages: UIMessage[]): number {
  if (messages.length === 0) return 0
  const text = messages
    .flatMap((m) => m.parts.filter((p) => p.type === 'text').map((p) => (p as { type: 'text'; text: string }).text))
    .join(' ')
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3)
}

interface UseChatOptions {
  conversationId: string | null
  initialMessages: UIMessage[]
  onConversationIdChange: (id: string) => void
  onConversationSaved: () => void
}

export function useChat({ conversationId, initialMessages, onConversationIdChange, onConversationSaved }: UseChatOptions) {
  const { provider, model, selected } = useModelPreference()
  const conversationIdRef = useRef(conversationId)
  useEffect(() => { conversationIdRef.current = conversationId }, [conversationId])

  const modelRef = useRef({ provider, model })
  useEffect(() => {
    modelRef.current = { provider, model }
  }, [provider, model])

  // eslint-disable-next-line react-hooks/refs -- ref is only read inside the headers callback, not during render
  const [transport] = useState(() =>
    new DefaultChatTransport({
      api: '/api/ai/chat',
      headers: () => ({
        'x-ai-provider': modelRef.current.provider,
        'x-ai-model': modelRef.current.model,
      }),
    }),
  )

  const { messages, sendMessage, status, stop, setMessages } = useAiChat({
    transport,
    messages: initialMessages,
    onError(error) {
      const msg = error?.message ?? ''

      let serverError: { error?: string; code?: string } = {}
      try { serverError = JSON.parse(msg) } catch { /* no es JSON */ }

      const code = serverError.code ?? ''
      const detail = serverError.error ?? ''

      if (code === 'AUTH_REQUIRED' || msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        toast.error('Sesión expirada. Recarga la página e inicia sesión.')
      } else if (code === 'RATE_LIMIT' || msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit')) {
        toast.error('Límite de uso alcanzado. Intenta en unos minutos.')
      } else if (code === 'INVALID_API_KEY') {
        toast.error('API key inválida. Revisa la configuración del modelo.')
      } else if (code === 'MODEL_NOT_FOUND') {
        toast.error('Modelo no disponible. Cambia el modelo en la barra superior.')
      } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch failed')) {
        toast.error('Sin conexión. Verifica tu red e intenta de nuevo.')
      } else if (msg.includes('AbortError') || msg.includes('aborted') || msg.includes('The operation was aborted')) {
        toast.error('La respuesta se interrumpió. Intenta de nuevo.')
      } else {
        toast.error(detail || 'Ocurrió un error al procesar tu solicitud.')
      }
    },
  })

  // Save to DB when messages change and AI is done responding
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onConversationIdChangeRef = useRef(onConversationIdChange)
  const onConversationSavedRef = useRef(onConversationSaved)
  useEffect(() => { onConversationIdChangeRef.current = onConversationIdChange }, [onConversationIdChange])
  useEffect(() => { onConversationSavedRef.current = onConversationSaved }, [onConversationSaved])

  useEffect(() => {
    if (status !== 'ready' || messages.length === 0) return

    // Debounce saves
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveConversation(conversationIdRef.current, messages)
        .then((id) => {
          if (id && id !== conversationIdRef.current) {
            onConversationIdChangeRef.current(id)
          }
          onConversationSavedRef.current()
        })
        .catch(() => {
          // Silent fail — localStorage was the previous behavior anyway
        })
    }, 500)

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [messages, status])

  // Ref so the branch store always reads the latest messages without stale closures
  const messagesRef = useRef(messages)
  useEffect(() => { messagesRef.current = messages }, [messages])

  const send = useCallback((text: string) => {
    sendMessage({ text })
  }, [sendMessage])

  const reload = useCallback(() => {
    const msgs = messagesRef.current
    let lastUserIdx = -1
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') { lastUserIdx = i; break }
    }
    if (lastUserIdx === -1) return

    const lastUserMsg = msgs[lastUserIdx]
    const text = lastUserMsg.parts
      .filter((p) => p.type === 'text')
      .map((p) => (p as { type: 'text'; text: string }).text)
      .join('')

    if (!text) return

    setMessages(msgs.slice(0, lastUserIdx))
    sendMessage({ text })
  }, [setMessages, sendMessage])

  const clear = useCallback(() => {
    setMessages([])
    // Delete from DB if there's a current conversation
    if (conversationIdRef.current) {
      saveConversation(conversationIdRef.current, []).catch(() => {})
    }
  }, [setMessages])

  const contextPct = selected.contextWindow > 0
    ? Math.min(100, Math.round((estimateTokens(messages) / selected.contextWindow) * 100))
    : 0

  return { messages, sendMessage: send, status, stop, clear, contextPct, reload, setMessages }
}
