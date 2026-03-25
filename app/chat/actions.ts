'use server'

import { generateText } from 'ai'
import { auth } from '@/auth'
import { loadTabs, listTabs } from '@/lib/sheets/client'
import { getModel } from '@/lib/ai/providers'
import type { Suggestion } from '@/lib/types'

const FALLBACK_SUGGESTIONS: Suggestion[] = [
  { icon: '📊', text: '¿Cómo voy vs el plan este año?' },
  { icon: '📈', text: 'Muéstrame la evolución del ingreso pasivo' },
  { icon: '💸', text: 'Grafica gastos fijos vs variables por mes' },
  { icon: '🏦', text: 'Muéstrame el estado de mis deudas' },
  { icon: '🔍', text: '¿Cuál es la tendencia de mis ingresos?' },
  { icon: '🎯', text: '¿Estoy en camino a mis metas financieras?' },
]

const ANGLES = [
  'patrimonio neto',
  'liquidez y flujo de caja',
  'deudas y pasivos',
  'ingreso pasivo',
  'proyecciones y metas',
  'riesgo financiero',
  'comparación histórica',
  'activos específicos',
]

function buildSuggestionsPrompt(
  availableTabs: string[],
  tabData: Record<string, string[][] | { error: string }>,
): string {
  const picked = [...ANGLES].sort(() => Math.random() - 0.5).slice(0, 3)
  const dataSection = Object.entries(tabData)
    .map(([name, data]) => `TAB "${name}":\n${JSON.stringify(data)}`)
    .join('\n\n')
  return `You are generating contextual question suggestions for CashflowAI, a personal finance AI coach. The user's Google Sheet has the following tabs: ${availableTabs.join(', ')}.

SAMPLE DATA:
${dataSection}

Generate exactly 6 short questions in professional, expert Colombian Spanish (use "usted" or neutral formal register — NOT "vos"). Each question must feel fresh and varied — no generic templates. Scan the data carefully: reference specific named assets, liabilities, goals, or metrics found in the sheets. Be precise with numbers when useful.

This session must emphasize these angles (rotate them so every session feels different): ${picked.join(', ')}.

Rules:
- Each question ≤ 80 characters
- Start with a single relevant emoji
- Vary question types: analysis, projection, risk, comparison, action
- Sound like a seasoned financial advisor probing the user's situation

Return ONLY a valid JSON array, no other text:
[{"icon": "📊", "text": "..."}, ...]`
}

function parseSuggestions(text: string): Suggestion[] {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return FALLBACK_SUGGESTIONS

  try {
    const parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed)) return FALLBACK_SUGGESTIONS

    const valid = parsed.filter(
      (item): item is Suggestion =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.icon === 'string' &&
        item.icon.length > 0 &&
        item.icon.length <= 4 &&
        typeof item.text === 'string' &&
        item.text.length > 0 &&
        item.text.length <= 120,
    )

    return valid.length >= 3 ? valid : FALLBACK_SUGGESTIONS
  } catch {
    return FALLBACK_SUGGESTIONS
  }
}

export async function getSuggestions(): Promise<Suggestion[]> {
  const session = await auth()
  if (!session?.accessToken) return FALLBACK_SUGGESTIONS

  try {
    const availableTabs = await listTabs()
    if (availableTabs.length === 0) return FALLBACK_SUGGESTIONS

    const sampleTabs = availableTabs.slice(0, 2)
    const tabData = await loadTabs(sampleTabs)

    const { text } = await generateText({
      model: getModel('anthropic', 'claude-haiku-4-5-20251001'),
      prompt: buildSuggestionsPrompt(availableTabs, tabData),
    })

    return parseSuggestions(text)
  } catch {
    return FALLBACK_SUGGESTIONS
  }
}
