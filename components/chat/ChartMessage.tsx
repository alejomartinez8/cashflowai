'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import type { VisualizationSpec } from 'vega-embed'

const VegaEmbed = dynamic(
  () => import('react-vega').then((m) => m.VegaEmbed),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-48 rounded-xl border border-border animate-pulse"
        style={{ background: 'var(--muted)' }}
      />
    ),
  },
)

interface Props {
  spec: string
}

export default function ChartMessage({ spec }: Props) {
  const [renderError, setRenderError] = useState(false)

  const parsed = useMemo<VisualizationSpec | null>(() => {
    try {
      return JSON.parse(spec) as VisualizationSpec
    } catch {
      return null
    }
  }, [spec])

  if (!parsed || renderError) {
    return (
      <div
        className="mt-3 rounded-xl border border-border px-4 py-3 text-xs text-muted-foreground"
        style={{ background: 'var(--muted)' }}
      >
        No se pudo renderizar el gráfico.
      </div>
    )
  }

  return (
    <div className="mt-3 w-full overflow-x-auto rounded-xl">
      <VegaEmbed
        spec={parsed}
        options={{ actions: false, renderer: 'svg' }}
        onError={() => setRenderError(true)}
        style={{ width: '100%' }}
      />
    </div>
  )
}
