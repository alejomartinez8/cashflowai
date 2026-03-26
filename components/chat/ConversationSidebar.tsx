'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { MessageSquarePlus, History, Trash2, X, PanelLeftOpen } from 'lucide-react'
import type { ConversationSummary } from '@/hooks/use-conversations'
import { deleteConversation } from '@/app/chat/conversation-actions'

interface ConversationSidebarProps {
  conversations: ConversationSummary[]
  currentId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onRefresh: () => void
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'ahora'
  if (diffMins < 60) return `hace ${diffMins}m`
  if (diffHours < 24) return `hace ${diffHours}h`
  if (diffDays < 7) return `hace ${diffDays}d`
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

export default function ConversationSidebar({
  conversations,
  currentId,
  onSelect,
  onNew,
  onRefresh,
}: ConversationSidebarProps) {
  const [open, setOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setDeletingId(id)
    try {
      await deleteConversation(id)
      if (id === currentId) onNew()
      onRefresh()
    } catch {
      // silent
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-[52px] left-2 z-30 p-1.5 rounded-lg bg-card border border-border hover:bg-muted transition-colors shadow-sm"
        title="Historial de conversaciones"
      >
        <PanelLeftOpen className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-72 bg-card border-r border-border shadow-xl transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Conversaciones</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-2">
          <button
            type="button"
            onClick={() => { onNew(); setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors border border-dashed border-primary/30"
          >
            <MessageSquarePlus className="w-4 h-4" />
            Nueva conversación
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center mt-8 px-4">
              Aún no hay conversaciones guardadas. Envía un mensaje para comenzar.
            </p>
          ) : (
            <div className="space-y-0.5">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => { onSelect(conv.id); setOpen(false) }}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors group flex items-start gap-2',
                    conv.id === currentId
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted text-foreground',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm">{conv.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatRelativeDate(conv.updatedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, conv.id)}
                    disabled={deletingId === conv.id}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all flex-shrink-0 mt-0.5"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
