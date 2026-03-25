import type { Suggestion } from '@/lib/types'

const FALLBACK_PROMPTS: Suggestion[] = [
  { icon: '📊', text: '¿Cómo voy vs el plan este año?' },
  { icon: '📈', text: 'Muéstrame la evolución del ingreso pasivo' },
  { icon: '💸', text: 'Grafica gastos fijos vs variables por mes' },
  { icon: '🏦', text: 'Muéstrame el estado de mis deudas' },
  { icon: '🔍', text: 'Compara mis ingresos de 2023, 2024 y 2025' },
  { icon: '🎯', text: '¿Estoy en camino a mis metas financieras?' },
]

interface Props {
  onSelect: (prompt: string) => void
  compact?: boolean
  suggestions?: Suggestion[] | null
  isLoading?: boolean
}

export default function QuickPrompts({ onSelect, compact = false, suggestions, isLoading = false }: Props) {
  const items = suggestions?.length ? suggestions : FALLBACK_PROMPTS

  if (compact) {
    return (
      <div className="max-w-3xl mx-auto overflow-x-auto pb-1 scrollbar-none">
        <div className="flex gap-2 w-max px-4">
          {items.map(({ icon, text }) => (
            <button
              key={text}
              onClick={() => onSelect(text)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full border border-border bg-card text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted transition-all${isLoading ? ' opacity-60' : ''}`}
            >
              <span>{icon}</span>
              <span>{text}</span>
            </button>
          ))}
          {isLoading && (
            <div className="flex items-center px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse flex-shrink-0" />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pb-4">
      <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map(({ icon, text }) => (
          <button
            key={text}
            onClick={() => onSelect(text)}
            className={`text-left px-4 py-3 rounded-xl border border-border bg-card text-card-foreground text-sm hover:border-primary/40 hover:bg-muted transition-all group${isLoading ? ' opacity-60' : ''}`}
            style={{ boxShadow: 'var(--shadow)' }}
          >
            <span className="mr-2">{icon}</span>
            <span className="text-muted-foreground group-hover:text-foreground transition-colors">{text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
