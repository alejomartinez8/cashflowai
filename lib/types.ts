export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string                      // text portion of the response
  chart?: Record<string, unknown>      // parsed Vega-Lite spec (if any)
  timestamp: Date
}
