'use client'

import dynamic from 'next/dynamic'
import type { VisualizationSpec } from 'vega-embed'

const VegaEmbed = dynamic(
  () => import('react-vega').then((m) => m.VegaEmbed),
  { ssr: false }
)

interface Props {
  spec: string
}

export default function ChartMessage({ spec }: Props) {
  let parsed: VisualizationSpec
  try {
    parsed = JSON.parse(spec) as VisualizationSpec
  } catch {
    return (
      <p className="text-xs text-muted-foreground italic">
        Error al renderizar el gráfico.
      </p>
    )
  }

  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card p-3">
      <VegaEmbed spec={parsed} options={{ actions: false }} />
    </div>
  )
}
