'use client'

import { useEffect, useRef, useState } from 'react'
import { useAvailableModels, useModelPreference } from '@/hooks/use-model-preference'

type ValidateResult = {
  ok: boolean
  provider: string
  model: string
  response?: string
  error?: string
}

export function ModelSwitcher() {
  const { models, loading } = useAvailableModels()
  const { selected, setModel } = useModelPreference(models)
  const [open, setOpen] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validateResult, setValidateResult] = useState<ValidateResult | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleValidate() {
    if (!selected) return
    setValidating(true)
    setValidateResult(null)
    try {
      const res = await fetch(
        `/api/ai/validate?provider=${selected.provider}&model=${encodeURIComponent(selected.model)}`,
      )
      const data: ValidateResult = await res.json()
      setValidateResult(data)
    } catch {
      setValidateResult({ ok: false, provider: '', model: '', error: 'Error de red' })
    } finally {
      setValidating(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-muted/50 hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Cambiar modelo de IA"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>
        </svg>
        <span className="hidden sm:inline max-w-[120px] truncate">
          {loading ? 'Cargando...' : (selected?.label ?? 'Sin modelo')}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden">
          <p className="px-3 pt-2.5 pb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Modelo activo
          </p>

          {loading && (
            <p className="px-3 py-3 text-xs text-muted-foreground">Cargando modelos...</p>
          )}

          {!loading && models.length === 0 && (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              No hay API keys configuradas.
            </p>
          )}

          {models.map((option) => {
            const isActive = option.provider === selected?.provider && option.model === selected?.model
            return (
              <button
                key={`${option.provider}:${option.model}`}
                onClick={() => { setModel(option); setOpen(false) }}
                className={`w-full text-left flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-muted ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
              >
                <span className="truncate">{option.label}</span>
                {isActive && (
                  <span className="ml-2 flex-shrink-0 rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-semibold">
                    activo
                  </span>
                )}
              </button>
            )
          })}

          <div className="border-t border-border mx-2 my-1" />
          <div className="px-2 pb-2">
            <button
              onClick={handleValidate}
              disabled={validating || !selected}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {validating ? 'Validando...' : 'Validar API key y modelo'}
            </button>
            {validateResult && (
              <div className={`mt-1.5 rounded-lg px-2.5 py-2 text-[10px] leading-relaxed ${validateResult.ok ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'}`}>
                {validateResult.ok ? (
                  <>
                    <div className="font-semibold mb-0.5">API key OK</div>
                    <div>Proveedor: <span className="font-medium">{validateResult.provider}</span></div>
                    <div>Modelo: <span className="font-medium">{validateResult.model}</span></div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold mb-0.5">Error</div>
                    {validateResult.provider && <div>Proveedor: {validateResult.provider}</div>}
                    {validateResult.model && <div>Modelo: {validateResult.model}</div>}
                    <div className="break-words">{validateResult.error}</div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
