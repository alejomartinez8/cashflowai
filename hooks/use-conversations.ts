'use client'

import { useState, useCallback } from 'react'
import {
  listConversations,
  loadConversation,
} from '@/app/chat/conversation-actions'

export interface ConversationSummary {
  id: string
  title: string
  updatedAt: Date
}

export function useConversations(initial: ConversationSummary[]) {
  const [conversationList, setConversationList] = useState<ConversationSummary[]>(initial)
  const [currentId, setCurrentId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const list = await listConversations()
      setConversationList(list)
    } catch {
      // silent
    }
  }, [])

  const onConversationIdChange = useCallback((id: string) => {
    setCurrentId(id)
  }, [])

  const startNew = useCallback(() => {
    setCurrentId(null)
  }, [])

  return {
    conversationList,
    currentId,
    refresh,
    loadConversation,
    startNew,
    onConversationIdChange,
  }
}
