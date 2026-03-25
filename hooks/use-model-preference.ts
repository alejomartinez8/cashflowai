'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const STORAGE_KEY = 'cashflowai_model'

export interface ModelOption {
  provider: string
  model: string
  label: string
  contextWindow: number
}

export const MODELS: ModelOption[] = [
  { provider: 'anthropic', model: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6', contextWindow: 200_000 },
  { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5',  contextWindow: 200_000 },
  { provider: 'openai',    model: 'gpt-4o',                    label: 'GPT-4o',             contextWindow: 128_000 },
  { provider: 'openai',    model: 'gpt-4o-mini',               label: 'GPT-4o mini',        contextWindow: 128_000 },
  { provider: 'google',    model: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview', contextWindow: 1_048_576 },
]

const DEFAULT = MODELS[0]

function readFromStorage(): ModelOption | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as ModelOption
    return MODELS.find((m) => m.provider === saved.provider && m.model === saved.model) ?? null
  } catch {
    return null
  }
}

export function useModelPreference() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const selected = useMemo(() => {
    const param = searchParams?.get('model')
    if (!param) return readFromStorage() ?? DEFAULT
    const colonIdx = param.indexOf(':')
    if (colonIdx === -1) return DEFAULT
    const provider = param.slice(0, colonIdx)
    const model = param.slice(colonIdx + 1)
    return MODELS.find((m) => m.provider === provider && m.model === model) ?? DEFAULT
  }, [searchParams])

  // Sync URL when there's no model param (e.g. navigating to /chat directly)
  useEffect(() => {
    if (!searchParams?.get('model')) {
      const params = new URLSearchParams(searchParams?.toString() ?? '')
      params.set('model', `${selected.provider}:${selected.model}`)
      router.replace(`?${params.toString()}`)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setModel = useCallback((option: ModelOption) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(option))
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('model', `${option.provider}:${option.model}`)
    router.replace(`?${params.toString()}`)
  }, [router, searchParams])

  return { provider: selected.provider, model: selected.model, selected, setModel }
}
