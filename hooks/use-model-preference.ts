'use client'

import { useCallback, useEffect, useState } from 'react'

export interface ModelOption {
  provider: string
  model: string
  label: string
}

export const MODELS: ModelOption[] = [
  { provider: 'anthropic', model: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  { provider: 'openai', model: 'gpt-4o', label: 'GPT-4o' },
  { provider: 'openai', model: 'gpt-4o-mini', label: 'GPT-4o mini' },
  { provider: 'google', model: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
]

const STORAGE_KEY = 'cashflowai_model'
const DEFAULT = MODELS[0]

function readFromStorage(): ModelOption {
  if (typeof window === 'undefined') return DEFAULT
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT
    const saved = JSON.parse(raw) as ModelOption
    const found = MODELS.find((m) => m.provider === saved.provider && m.model === saved.model)
    return found ?? DEFAULT
  } catch {
    return DEFAULT
  }
}

export function useModelPreference() {
  const [selected, setSelected] = useState<ModelOption>(DEFAULT)

  useEffect(() => {
    setSelected(readFromStorage())
  }, [])

  const setModel = useCallback((option: ModelOption) => {
    setSelected(option)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(option))
  }, [])

  return { provider: selected.provider, model: selected.model, selected, setModel }
}
