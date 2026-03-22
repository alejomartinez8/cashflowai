'use client'

import { useChat as useAIChat } from '@ai-sdk/react'
import { useEffect } from 'react'

const STORAGE_KEY = 'cashflowai_messages'
const MAX_MESSAGES = 50

function loadHistory() {
  if (typeof window === 'undefined') return []
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

export function useChat() {
  const { messages, input, handleInputChange, handleSubmit, status, stop, setMessages } =
    useAIChat({
      api: '/api/ai/chat',
      initialMessages: loadHistory(),
    })

  useEffect(() => {
    if (messages.length > 0) {
      const toSave = messages.slice(-MAX_MESSAGES)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    }
  }, [messages])

  function clear() {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
  }

  return { messages, input, handleInputChange, handleSubmit, status, stop, clear }
}
