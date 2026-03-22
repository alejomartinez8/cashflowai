const QUICK_PROMPTS = [
  { icon: '📊', text: '¿Cómo voy vs el plan este año?' },
  { icon: '📈', text: 'Muéstrame la evolución del ingreso pasivo' },
  { icon: '🎯', text: '¿Cuándo alcanzo la libertad financiera?' },
  { icon: '💸', text: 'Grafica gastos fijos vs variables por mes' },
  { icon: '🏠', text: '¿Qué impacto tuvo el sobrecosto de la casa en el plan?' },
  { icon: '💡', text: 'Simula un nuevo ingreso pasivo de $3M al mes' },
  { icon: '🏦', text: 'Muéstrame el estado de mis deudas' },
  { icon: '🔍', text: 'Compara mis ingresos de 2023, 2024 y 2025' },
] as const

interface Props {
  onSelect: (prompt: string) => void
  compact?: boolean
}

export default function QuickPrompts({ onSelect, compact = false }: Props) {
  if (compact) {
    return (
      <div className="max-w-3xl mx-auto overflow-x-auto pb-1 scrollbar-none">
        <div className="flex gap-2 w-max px-4">
          {QUICK_PROMPTS.map(({ icon, text }) => (
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
        {QUICK_PROMPTS.map(({ icon, text }) => (
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
