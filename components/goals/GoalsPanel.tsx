'use client'

import { FINANCIAL_GOALS, CATEGORY_COLORS, deadlineLabel } from '@/lib/goals'
import { cn } from '@/lib/utils'

interface Props {
  onPrompt: (prompt: string) => void
}

export default function GoalsPanel({ onPrompt }: Props) {
  return (
    <div className="px-4 pb-2">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
          Metas financieras
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FINANCIAL_GOALS.map((goal) => {
            const colorClasses = CATEGORY_COLORS[goal.category]
            const years = deadlineLabel(goal.deadline)
            return (
              <button
                key={goal.id}
                onClick={() => onPrompt(goal.prompt)}
                className="group text-left px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-muted transition-all"
                style={{ boxShadow: 'var(--shadow)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base flex-shrink-0">{goal.emoji}</span>
                    <span className="text-sm font-medium text-foreground truncate group-hover:text-foreground transition-colors">
                      {goal.title}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'flex-shrink-0 text-xs font-mono px-1.5 py-0.5 rounded-md border',
                      colorClasses,
                    )}
                  >
                    {years}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-7 leading-snug">
                  {goal.subtitle}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
