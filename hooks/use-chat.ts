'use client'

import { useChat as useAiChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { UIMessage } from 'ai'
import { toast } from 'sonner'
import { useModelPreference } from './use-model-preference'
import { STORAGE_KEYS } from '@/lib/constants'

function estimateTokens(messages: UIMessage[]): number {
  if (messages.length === 0) return 0
  const text = messages
    .flatMap((m) => m.parts.filter((p) => p.type === 'text').map((p) => (p as { type: 'text'; text: string }).text))
    .join(' ')
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3)
}

const MAX_MESSAGES = 50

export function useChat({ userId }: { userId: string }) {
  const storageKey = STORAGE_KEYS.MESSAGES(userId)
  const [input, setInput] = useState('')
  const { provider, model, selected } = useModelPreference()

  const [initialMessages] = useState<UIMessage[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const modelRef = useRef({ provider, model })
  useEffect(() => {
    modelRef.current = { provider, model }
  }, [provider, model])

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/ai/chat',
        headers: () => ({
          'x-ai-provider': modelRef.current.provider,
          'x-ai-model': modelRef.current.model,
        }),
      }),
    [],
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
      } else {
        toast.error(detail || 'Ocurrió un error al procesar tu solicitud.')
      }
    },
  })

  useEffect(() => {
    if (messages.length > 0) {
      const trimmed = messages.slice(-MAX_MESSAGES)
      localStorage.setItem(storageKey, JSON.stringify(trimmed))
    }
  }, [messages, storageKey])

  function send(text: string) {
    sendMessage({ text })
  }

  function clear() {
    setMessages([])
    localStorage.removeItem(storageKey)
  }

  const contextPct = selected.contextWindow > 0
    ? Math.min(100, Math.round((estimateTokens(messages) / selected.contextWindow) * 100))
    : 0

  return { messages, input, setInput, sendMessage: send, status, stop, clear, contextPct }
}
