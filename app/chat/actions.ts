'use server'

import { generateText } from 'ai'
import { auth } from '@/auth'
import { loadTabs } from '@/lib/sheets/client'
import { getModel } from '@/lib/ai/providers'
import type { Suggestion } from '@/lib/types'

const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes
let cache: { data: Suggestion[]; ts: number } | null = null

const FALLBACK_SUGGESTIONS: Suggestion[] = [
  { icon: '📊', text: '¿Cómo voy vs el plan este año?' },
  { icon: '📈', text: 'Muéstrame la evolución del ingreso pasivo' },
  { icon: '💸', text: 'Grafica gastos fijos vs variables por mes' },
  { icon: '🏦', text: 'Muéstrame el estado de mis deudas' },
  { icon: '🔍', text: 'Compara mis ingresos de 2023, 2024 y 2025' },
  { icon: '🎯', text: '¿Estoy en camino a mis metas financieras?' },
]

function buildSuggestionsPrompt(balanceRaw: string): string {
  return `You are generating contextual question suggestions for CashflowAI, a personal finance AI for a Colombian user. Below is their "Balance" tab data (raw 2D array from Google Sheets API).

BALANCE DATA:
${balanceRaw}

Generate exactly 6 short questions in Colombian Spanish (using "vos") that this user would find most insightful RIGHT NOW. Be specific to their actual data (reference real numbers or named items when useful). Cover a variety of angles: trends, goals, risks, comparisons, projections.
Each question must be ≤ 80 characters and start with a single relevant emoji.

Return ONLY a valid JSON array, no other text:
[{"icon": "📊", "text": "¿Cómo va tu patrimonio neto este año?"}, ...]`
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

  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) return cache.data

  try {
    const tabData = await loadTabs(['Balance'])
    const balanceRaw = JSON.stringify(tabData['Balance'])

    const { text } = await generateText({
      model: getModel('anthropic', 'claude-haiku-4-5-20251001'),
      prompt: buildSuggestionsPrompt(balanceRaw),
    })

    const suggestions = parseSuggestions(text)
    cache = { data: suggestions, ts: Date.now() }
    return suggestions
  } catch {
    return FALLBACK_SUGGESTIONS
  }
}
