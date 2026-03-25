'use client'

import { Component, type ReactNode, useRef, useState } from 'react'
import { isToolUIPart, type UIMessage } from 'ai'
import ChartMessage from './ChartMessage'
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message'
import { Tool, type AnyToolPart } from '@/components/ai-elements/tool'
import { BranchNav } from '@/components/ai-elements/branch'
import { TabsContext } from './TabsContext'
import { cn } from '@/lib/utils'
import { TOOL_NAMES } from '@/lib/constants'
import { toast } from 'sonner'
import type { BranchStore } from '@/hooks/use-branch-store'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Error al renderizar este mensaje.
        </div>
      )
    }
    return this.props.children
  }
}

function isGetSheetData(part: AnyToolPart): boolean {
  return (
    part.type === `tool-${TOOL_NAMES.GET_SHEET_DATA}` ||
    (part.type === 'dynamic-tool' && (part as { type: string; toolName: string }).toolName === TOOL_NAMES.GET_SHEET_DATA)
  )
}

interface Props {
  message: UIMessage
  isStreaming?: boolean
  branchStore?: BranchStore
  onEdit?: (messageId: string, newText: string) => void
}

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => (p as { type: 'text'; text: string }).text)
    .join('')
}

function splitContent(text: string, isStreaming = false): { prose: string; chartSpec: string | null } {
  const completeMatch = text.match(/```chart\r?\n([\s\S]*?)\r?\n```/)
  if (completeMatch) {
    return {
      prose: text.replace(/```chart\r?\n[\s\S]*?\r?\n```/, '').trim(),
      chartSpec: completeMatch[1].trim(),
    }
  }
  // During streaming, strip partial chart blocks so prose only grows forward —
  // never shrinks — avoiding animation cursor misalignment in Streamdown.
  if (isStreaming) {
    const partialIdx = text.indexOf('```chart')
    if (partialIdx !== -1) {
      return { prose: text.slice(0, partialIdx).trim(), chartSpec: null }
    }
  }
  return { prose: text, chartSpec: null }
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar al portapapeles.')
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copiado' : 'Copiar'}
      className={cn(
        'flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all',
        className,
      )}
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        </svg>
      )}
    </button>
  )
}

const BotIcon = () => (
  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>
    </svg>
  </div>
)

// ── User message with inline edit mode ─────────────────────────────────────

function UserMessage({ message, text, onEdit }: { message: UIMessage; text: string; onEdit?: (id: string, t: string) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function startEdit() {
    setEditText(text)
    setIsEditing(true)
    // Focus textarea after state update
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  function cancelEdit() {
    setIsEditing(false)
    setEditText(text)
  }

  function submitEdit() {
    const trimmed = editText.trim()
    if (!trimmed || trimmed === text) {
      setIsEditing(false)
      return
    }
    onEdit?.(message.id, trimmed)
    setIsEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitEdit()
    }
    if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  if (isEditing) {
    return (
      <Message from="user">
        <div className="flex flex-col gap-2 w-full">
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            className={cn(
              'w-full resize-none rounded-2xl border border-primary/50 bg-background px-4 py-2.5 text-sm',
              'text-foreground placeholder:text-muted-foreground focus:outline-none',
              'focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)] leading-relaxed',
            )}
            style={{ boxShadow: 'var(--shadow-md)' }}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submitEdit}
              disabled={!editText.trim()}
              className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-all"
            >
              Regenerar
            </button>
          </div>
        </div>
      </Message>
    )
  }

  return (
    <Message from="user">
      <div className="flex flex-col items-end gap-1">
        <MessageContent
          className="text-primary-foreground"
          style={{ background: 'var(--primary)' }}
        >
          <p className="whitespace-pre-wrap break-words leading-relaxed">{text}</p>
        </MessageContent>
        {/* Action row — matches assistant's pattern */}
        <div className="flex items-center gap-1 mr-1">
          <CopyButton text={text} />
          {onEdit && (
            <button
              type="button"
              onClick={startEdit}
              title="Editar mensaje"
              className="flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              {/* Pencil icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </Message>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function MessageBubble({ message, isStreaming, branchStore, onEdit }: Props) {
  const isUser = message.role === 'user'
  const text = extractText(message)

  if (isUser) {
    return <UserMessage message={message} text={text} onEdit={onEdit} />
  }

  const { prose, chartSpec } = splitContent(text, isStreaming)
  const toolParts = message.parts.filter(isToolUIPart)

  return (
    <Message from="assistant">
      <div className="flex gap-3 items-start">
        <BotIcon />
        <ErrorBoundary>
          <div className="flex-1 min-w-0">
            {toolParts.length > 0 && (
              <div className="mb-2">
                {toolParts.map((part) =>
                  isGetSheetData(part as AnyToolPart) ? (
                    <TabsContext key={part.toolCallId} part={part as AnyToolPart} className="mb-2" />
                  ) : (
                    <Tool key={part.toolCallId} part={part} />
                  )
                )}
              </div>
            )}
            {prose && (
              <MessageContent
                className="rounded-2xl rounded-tl-sm px-4 py-3 border border-border w-full max-w-full"
                style={{ background: 'var(--card)', color: 'var(--card-foreground)', boxShadow: 'var(--shadow)' }}
              >
                <MessageResponse isAnimating={isStreaming}>{prose}</MessageResponse>
              </MessageContent>
            )}
            {chartSpec && <ChartMessage spec={chartSpec} />}
            {!isStreaming && prose && (
              <div className="mt-1 ml-1 flex items-center gap-2">
                <CopyButton text={prose} />
                {branchStore && (
                  <BranchNav branchStore={branchStore} isStreaming={isStreaming} />
                )}
              </div>
            )}
          </div>
        </ErrorBoundary>
      </div>
    </Message>
  )
}
