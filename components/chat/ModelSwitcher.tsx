'use client'

import { useEffect, useRef, useState } from 'react'
import { MODELS, useModelPreference } from '@/hooks/use-model-preference'

export function ModelSwitcher() {
  const { selected, setModel } = useModelPreference()
  const [open, setOpen] = useState(false)
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
        <span className="hidden sm:inline max-w-[100px] truncate">{selected.label}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden">
          <p className="px-3 pt-2.5 pb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Modelo activo
          </p>
          {MODELS.map((option) => {
            const isActive = option.provider === selected.provider && option.model === selected.model
            return (
              <button
                key={`${option.provider}:${option.model}`}
                onClick={() => { setModel(option); setOpen(false) }}
                className={`w-full text-left flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-muted ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
              >
                <span>{option.label}</span>
                {isActive && (
                  <span className="ml-2 rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-semibold">
                    activo
                  </span>
                )}
              </button>
            )
          })}
          <div className="h-1.5" />
        </div>
      )}
    </div>
  )
}
