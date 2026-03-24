export type GoalCategory = 'freedom' | 'income' | 'debt' | 'assets'

export interface FinancialGoal {
  id: string
  emoji: string
  title: string
  subtitle: string
  deadline: string // ISO date 'YYYY-MM-DD'
  category: GoalCategory
  /** Prompt that gets sent to the AI when the user clicks "Consultar" */
  prompt: string
}

export const FINANCIAL_GOALS: FinancialGoal[] = [
  {
    id: 'freedom-2032',
    emoji: '🏁',
    title: 'Libertad Financiera 2032',
    subtitle: 'Ingreso pasivo ≥ gastos mensuales',
    deadline: '2032-12-31',
    category: 'freedom',
    prompt: '¿Cuándo alcanzo la libertad financiera si mantengo el ritmo actual? Muéstrame la proyección.',
  },
  {
    id: 'second-asset-2027',
    emoji: '📈',
    title: 'Segundo activo productivo',
    subtitle: 'Nuevo ingreso pasivo antes de 2027',
    deadline: '2027-12-31',
    category: 'income',
    prompt: '¿Qué opciones tengo para activar un segundo activo productivo antes de 2027 con mi situación actual?',
  },
  {
    id: 'debt-free-2030',
    emoji: '🏦',
    title: 'Cero deudas bancarias',
    subtitle: 'Saldar todos los préstamos',
    deadline: '2030-12-31',
    category: 'debt',
    prompt: '¿Cuánto me falta para pagar todas las deudas bancarias y cuál es la estrategia más eficiente?',
  },
  {
    id: 'patrimonio-2030',
    emoji: '💎',
    title: 'Patrimonio $2.000M COP',
    subtitle: 'Duplicar el patrimonio neto actual',
    deadline: '2030-12-31',
    category: 'assets',
    prompt: '¿Cómo va la evolución de mi patrimonio neto y cuándo llego a $2.000 millones COP?',
  },
]

/** Returns the number of full years remaining from today until the deadline */
export function yearsUntil(deadline: string): number {
  const now = new Date()
  const end = new Date(deadline)
  const diff = end.getFullYear() - now.getFullYear()
  const monthDiff = end.getMonth() - now.getMonth()
  return monthDiff < 0 ? diff - 1 : diff
}

/** Returns a human-readable label like "6 años" or "< 1 año" */
export function deadlineLabel(deadline: string): string {
  const years = yearsUntil(deadline)
  if (years <= 0) return '< 1 año'
  if (years === 1) return '1 año'
  return `${years} años`
}

export const CATEGORY_COLORS: Record<GoalCategory, string> = {
  freedom: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  income: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  debt: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  assets: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
}
