'use client'

import { memo, useEffect, useRef, useState } from 'react'
import type { VisualizationSpec } from 'vega-embed'

interface Props {
  spec: string
}

function ChartMessage({ spec }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!containerRef.current) return

    let parsed: VisualizationSpec
    try {
      parsed = JSON.parse(spec) as VisualizationSpec
    } catch (e) {
      setErrorMsg(`Especificación inválida: ${e instanceof Error ? e.message : 'JSON malformado'}`)
      setLoading(false)
      return
    }

    const responsive = { ...parsed, width: 'container' } as VisualizationSpec
    let cancelled = false
    let vegaView: { finalize: () => void } | null = null

    import('vega-embed').then(({ default: embed }) => {
      if (cancelled || !containerRef.current) return
      embed(containerRef.current, responsive, { actions: false })
        .then((result) => {
          if (cancelled) {
            result.view.finalize()
          } else {
            vegaView = result.view
            setLoading(false)
          }
        })
        .catch((e: unknown) => {
          setErrorMsg(`Error de renderizado: ${e instanceof Error ? e.message : 'desconocido'}`)
          setLoading(false)
        })
    })

    return () => {
      cancelled = true
      vegaView?.finalize()
    }
  }, [spec])

  if (errorMsg) {
    return (
      <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
        <p className="text-xs font-medium text-destructive">Error al renderizar el gráfico</p>
        <p className="text-xs text-muted-foreground mt-0.5">{errorMsg}</p>
      </div>
    )
  }

  return (
    <div className="mt-3 w-full rounded-xl border border-border bg-card p-3">
      {loading && (
        <div className="animate-pulse space-y-2 py-2">
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="h-40 w-full rounded bg-muted" />
        </div>
      )}
      <div ref={containerRef} className="w-full" />
    </div>
  )
}

export default memo(ChartMessage, (prev, next) => prev.spec === next.spec)
