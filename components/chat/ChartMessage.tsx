'use client'

import { useEffect, useRef, useState } from 'react'
import type { VisualizationSpec } from 'vega-embed'

interface Props {
  spec: string
}

export default function ChartMessage({ spec }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    let parsed: VisualizationSpec
    try {
      parsed = JSON.parse(spec) as VisualizationSpec
    } catch {
      setError(true)
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
          }
        })
        .catch(() => setError(true))
    })

    return () => {
      cancelled = true
      vegaView?.finalize()
    }
  }, [spec])

  if (error) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Error al renderizar el gráfico.
      </p>
    )
  }

  return (
    <div className="mt-3 w-full rounded-xl border border-border bg-card p-3">
      <div ref={containerRef} className="w-full" />
    </div>
  )
}
