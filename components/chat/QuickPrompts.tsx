const QUICK_PROMPTS = [
  '¿Cómo voy vs el plan este año?',
  'Muéstrame la evolución del ingreso pasivo',
  '¿Cuándo alcanzo la libertad financiera?',
  'Grafica gastos fijos vs variables por mes',
  '¿Qué impacto tuvo el sobrecosto de la casa en el plan?',
  'Simula un nuevo ingreso pasivo de $3M al mes',
  'Muéstrame el estado de mis deudas',
  'Compara mis ingresos de 2023, 2024 y 2025',
] as const

interface Props {
  onSelect: (prompt: string) => void
}

export default function QuickPrompts({ onSelect }: Props) {
  return (
    <div className="px-4 pb-4">
      <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelect(prompt)}
            className="text-left px-4 py-3 rounded-xl border border-border bg-card text-card-foreground text-sm hover:bg-muted hover:border-primary/30 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}
