'use client'

import type { UIMessage } from 'ai'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import MessageBubble from './MessageBubble'
import type { BranchStore } from '@/hooks/use-branch-store'

interface Props {
  messages: UIMessage[]
  status: string
  branchStore?: BranchStore
}

const TypingIndicator = () => (
  <div className="flex justify-start gap-3 items-start">
    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>
      </svg>
    </div>
    <div
      className="rounded-2xl rounded-tl-sm px-4 py-3 border border-border"
      style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}
    >
      <div className="flex gap-1.5 items-center h-4">
        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
      </div>
    </div>
  </div>
)

export default function ChatWindow({ messages, status, branchStore }: Props) {
  const isLoading = status === 'submitted' || status === 'streaming'

  // Index of the last assistant message in the array
  const lastAssistantIdx = messages.map(m => m.role).lastIndexOf('assistant')

  return (
    <Conversation className="flex-1">
      <ConversationContent className="max-w-3xl mx-auto w-full">
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={isLoading && idx === messages.length - 1}
            branchStore={msg.role === 'assistant' && idx === lastAssistantIdx && !isLoading ? branchStore : undefined}
          />
        ))}
        {isLoading && <TypingIndicator />}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
}
