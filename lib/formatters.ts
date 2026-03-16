export const formatCOP = (value: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export const formatMillions = (value: number): string =>
  `$${(value / 1_000_000).toFixed(1)}M`

export const formatPercentage = (value: number, decimals = 1): string =>
  `${(value * 100).toFixed(decimals)}%`
