'use client'

import { useState } from 'react'
import { isToolUIPart, type UIMessage } from 'ai'
import ChartMessage from './ChartMessage'
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message'
import { Tool, type AnyToolPart } from '@/components/ai-elements/tool'
import { TabsContext } from './TabsContext'
import { cn } from '@/lib/utils'

function isGetSheetData(part: AnyToolPart): boolean {
  return (
    part.type === 'tool-get_sheet_data' ||
    (part.type === 'dynamic-tool' && (part as { type: string; toolName: string }).toolName === 'get_sheet_data')
  )
}

interface Props {
  message: UIMessage
  isStreaming?: boolean
}

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => (p as { type: 'text'; text: string }).text)
    .join('')
}

function splitContent(text: string): { prose: string; chartSpec: string | null } {
  const match = text.match(/```chart\n([\s\S]*?)```/)
  if (!match) return { prose: text, chartSpec: null }
  return {
    prose: text.replace(/```chart\n[\s\S]*?```/, '').trim(),
    chartSpec: match[1].trim(),
  }
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
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

export default function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user'
  const text = extractText(message)

  if (isUser) {
    return (
      <Message from="user">
        <div className="group flex items-start gap-1.5 justify-end">
          <CopyButton
            text={text}
            className="opacity-0 group-hover:opacity-100 mt-1.5"
          />
          <MessageContent
            className="text-primary-foreground"
            style={{ background: 'var(--primary)' }}
          >
            <p className="whitespace-pre-wrap break-words leading-relaxed">{text}</p>
          </MessageContent>
        </div>
      </Message>
    )
  }

  const { prose, chartSpec } = splitContent(text)
  const toolParts = message.parts.filter(isToolUIPart)

  return (
    <Message from="assistant">
      <div className="flex gap-3 items-start">
        <BotIcon />
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
          <MessageContent
            className="rounded-2xl rounded-tl-sm px-4 py-3 border border-border w-full max-w-full"
            style={{ background: 'var(--card)', color: 'var(--card-foreground)', boxShadow: 'var(--shadow)' }}
          >
            {prose && <MessageResponse isAnimating={isStreaming}>{prose}</MessageResponse>}
          </MessageContent>
          {chartSpec && <ChartMessage spec={chartSpec} />}
          {!isStreaming && prose && (
            <div className="mt-1 ml-1">
              <CopyButton text={prose} />
            </div>
          )}
        </div>
      </div>
    </Message>
  )
}
