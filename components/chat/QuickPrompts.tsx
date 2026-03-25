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
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-7 w-28 rounded-full bg-muted animate-pulse flex-shrink-0" />
              ))
            : items.map(({ icon, text }) => (
                <button
                  key={text}
                  onClick={() => onSelect(text)}
                  className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full border border-border bg-card text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted transition-all"
                >
                  <span>{icon}</span>
                  <span>{text}</span>
                </button>
              ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pb-4">
      <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
            ))
          : items.map(({ icon, text }) => (
              <button
                key={text}
                onClick={() => onSelect(text)}
                className="text-left px-4 py-3 rounded-xl border border-border bg-card text-card-foreground text-sm hover:border-primary/40 hover:bg-muted transition-all group"
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
