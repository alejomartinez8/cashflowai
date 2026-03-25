'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { UIMessage } from 'ai'

interface UseBranchStoreProps {
  messages: UIMessage[]
  status: string
  reload: () => void
  setMessages: (messages: UIMessage[]) => void
}

export interface BranchStore {
  branches: UIMessage[]
  currentIdx: number
  totalBranches: number
  regenerate: () => void
  navigateTo: (idx: number) => void
  clearBranches: () => void
}

export function useBranchStore({
  messages,
  status,
  reload,
  setMessages,
}: UseBranchStoreProps): BranchStore {
  const [branches, setBranches] = useState<UIMessage[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [pendingCapture, setPendingCapture] = useState(false)

  const messagesRef = useRef(messages)
  useEffect(() => { messagesRef.current = messages }, [messages])

  const prevStatus = useRef(status)

  // Reset branches when the user sends a new message
  const lastUserMsgId = messages.filter(m => m.role === 'user').at(-1)?.id
  const lastUserMsgIdRef = useRef<string | undefined>(lastUserMsgId)

  useEffect(() => {
    if (lastUserMsgId && lastUserMsgId !== lastUserMsgIdRef.current) {
      setBranches([])
      setCurrentIdx(0)
      setPendingCapture(false)
      lastUserMsgIdRef.current = lastUserMsgId
    }
  }, [lastUserMsgId])

  // After a regeneration stream completes, capture the new response as a branch
  useEffect(() => {
    const wasActive =
      prevStatus.current === 'streaming' || prevStatus.current === 'submitted'
    const isNowReady = status === 'ready'

    if (wasActive && isNowReady && pendingCapture) {
      const msgs = messagesRef.current
      const lastAssistant = msgs.filter(m => m.role === 'assistant').at(-1)

      if (lastAssistant) {
        setBranches(prev => {
          // Avoid duplicates (same message id)
          if (prev.some(b => b.id === lastAssistant.id)) return prev
          return [...prev, lastAssistant]
        })
        setCurrentIdx(prev => prev + 1)
      }
      setPendingCapture(false)
    }

    prevStatus.current = status
  }, [status, pendingCapture])

  const regenerate = useCallback(() => {
    const msgs = messagesRef.current
    const lastAssistant = msgs.filter(m => m.role === 'assistant').at(-1)

    if (lastAssistant) {
      setBranches(prev => {
        // Seed with the current response if this is the first regeneration
        if (prev.length === 0) return [lastAssistant]
        // Don't re-add if it's already there
        if (prev.some(b => b.id === lastAssistant.id)) return prev
        return prev
      })
    }

    setPendingCapture(true)
    reload()
  }, [reload])

  const navigateTo = useCallback(
    (idx: number) => {
      const targetMsg = branches[idx]
      if (!targetMsg) return

      const msgs = messagesRef.current
      const lastAssistantIdx = msgs.map(m => m.role).lastIndexOf('assistant')
      if (lastAssistantIdx === -1) return

      setMessages([
        ...msgs.slice(0, lastAssistantIdx),
        targetMsg,
        ...msgs.slice(lastAssistantIdx + 1),
      ])
      setCurrentIdx(idx)
    },
    [branches, setMessages]
  )

  const clearBranches = useCallback(() => {
    setBranches([])
    setCurrentIdx(0)
    setPendingCapture(false)
  }, [])

  return {
    branches,
    currentIdx,
    totalBranches: branches.length,
    regenerate,
    navigateTo,
    clearBranches,
  }
}
