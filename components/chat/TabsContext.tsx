'use client'

import { cn } from '@/lib/utils'
import type { AnyToolPart } from '@/components/ai-elements/tool'
import { DatabaseIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from 'lucide-react'

function extractTabs(part: AnyToolPart): string[] | null {
  if (
    part.state === 'input-streaming' ||
    part.input == null ||
    typeof part.input !== 'object' ||
    !('tabs' in part.input) ||
    !Array.isArray((part.input as { tabs: unknown }).tabs)
  )
    return null
  return (part.input as { tabs: string[] }).tabs
}

export function TabsContext({ part, className }: { part: AnyToolPart; className?: string }) {
  const tabs = extractTabs(part)
  const isError = part.state === 'output-error'
  const isDone = part.state === 'output-available' || isError

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2',
        className,
      )}
    >
      <DatabaseIcon className="size-4 text-muted-foreground shrink-0" />
      <span className="text-xs font-medium text-muted-foreground shrink-0">Consultando</span>
      <div className="flex flex-wrap gap-1.5 min-w-0 flex-1">
        {!tabs || tabs.length === 0 ? (
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
            …
          </span>
        ) : (
          tabs.map((tab) => (
            <span
              key={tab}
              className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono font-medium text-foreground"
            >
              {tab}
            </span>
          ))
        )}
      </div>
      {isDone ? (
        isError ? (
          <XCircleIcon className="size-4 text-red-500 shrink-0" />
        ) : (
          <CheckCircleIcon className="size-4 text-green-500 shrink-0" />
        )
      ) : (
        <ClockIcon className="size-4 text-yellow-500 animate-pulse shrink-0" />
      )}
    </div>
  )
}
