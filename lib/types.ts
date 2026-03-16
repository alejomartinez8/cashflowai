export type TabName =
  | '2025' | '2024' | '2023'
  | 'Proyecciones' | 'Balance'
  | 'New Home' | 'Deudas Banco' | 'Prestamos'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string                      // text portion of the response
  chart?: Record<string, unknown>      // parsed Vega-Lite spec (if any)
  timestamp: Date
}
