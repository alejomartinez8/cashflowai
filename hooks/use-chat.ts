'use client'

import { useChat as useAiChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useMemo, useState } from 'react'
import type { UIMessage } from 'ai'
import { toast } from 'sonner'
import { useModelPreference } from './use-model-preference'

function estimateTokens(messages: UIMessage[]): number {
  if (messages.length === 0) return 0
  return Math.ceil(JSON.stringify(messages).length / 3.5)
}

const STORAGE_KEY = 'cashflowai_messages'
const MAX_MESSAGES = 50

function loadFromStorage(): UIMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage(messages: UIMessage[]) {
  const trimmed = messages.slice(-MAX_MESSAGES)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

const storedMessages = loadFromStorage()

export function useChat() {
  const [input, setInput] = useState('')
  const { provider, model, selected } = useModelPreference()

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/ai/chat',
        headers: {
          'x-ai-provider': provider,
          'x-ai-model': model,
        },
      }),
    [provider, model],
  )

  const { messages, sendMessage, status, stop, setMessages } = useAiChat({
    transport,
    messages: storedMessages,
    onError(error) {
      const msg = error?.message ?? ''
      if (msg.includes('quota') || msg.includes('429')) {
        toast.error('Se agotó la cuota de Google Sheets. Intenta en unos minutos.')
      } else {
        toast.error('Ocurrió un error al procesar tu solicitud.')
      }
    },
  })

  useEffect(() => {
    if (messages.length > 0) {
      saveToStorage(messages)
    }
  }, [messages])

  function send(text: string) {
    sendMessage({ text })
  }

  function clear() {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
  }

  const contextPct = selected.contextWindow > 0
    ? Math.min(100, Math.round((estimateTokens(messages) / selected.contextWindow) * 100))
    : 0

  return { messages, input, setInput, sendMessage: send, status, stop, clear, contextPct }
}
