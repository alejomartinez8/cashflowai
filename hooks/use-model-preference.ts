'use client'

import { useCallback, useEffect, useState } from 'react'

export interface ModelOption {
  provider: string
  model: string
  label: string
  contextWindow: number
}

const STORAGE_KEY = 'cashflowai_model'

export function useAvailableModels() {
  const [models, setModels] = useState<ModelOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ai/providers')
      .then((r) => r.json())
      .then((data: ModelOption[]) => {
        setModels(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return { models, loading }
}

export function useModelPreference(models: ModelOption[]) {
  const [selected, setSelected] = useState<ModelOption | null>(null)

  useEffect(() => {
    if (!models.length) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as ModelOption
        const found = models.find(
          (m) => m.provider === saved.provider && m.model === saved.model,
        )
        if (found) {
          setSelected(found)
          return
        }
      }
    } catch {
      // ignore
    }
    setSelected(models[0])
  }, [models])

  const setModel = useCallback((option: ModelOption) => {
    setSelected(option)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(option))
  }, [])

  return { selected: selected ?? models[0] ?? null, setModel }
}
