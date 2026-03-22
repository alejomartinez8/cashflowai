'use client'

import { useChat as useAiChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { UIMessage } from 'ai'

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

export function useChat() {
  const initialMessages = useRef<UIMessage[]>(loadFromStorage())
  const [input, setInput] = useState('')

  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/ai/chat' }),
    [],
  )

  const { messages, sendMessage, status, stop, setMessages } = useAiChat({
    transport,
    messages: initialMessages.current,
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

  return { messages, input, setInput, sendMessage: send, status, stop, clear }
}
