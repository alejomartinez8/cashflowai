import { streamText, tool, stepCountIs, convertToModelMessages } from 'ai'
import { z } from 'zod'
import { auth } from '@/auth'
import { getModel } from '@/lib/ai/providers'
import { buildSystemPrompt } from '@/lib/ai/prompts'
import { loadTabs, listTabs } from '@/lib/sheets/client'
import { TOOL_NAMES } from '@/lib/constants'

// Allow up to 60s for streaming AI responses (prevents serverless timeout mid-stream)
export const maxDuration = 60

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })
  if (session.user?.email !== process.env.ALLOWED_EMAIL) {
    return new Response('Forbidden', { status: 403 })
  }

  const providerHeader = req.headers.get('x-ai-provider') ?? undefined
  const modelHeader = req.headers.get('x-ai-model') ?? undefined

  const { messages: uiMessages } = await req.json()
  // Keep only the last 20 messages to limit input token usage
  const recentUiMessages = Array.isArray(uiMessages) ? uiMessages.slice(-20) : uiMessages
  const messages = await convertToModelMessages(recentUiMessages) // type says Promise<> at runtime

  try {
    const result = await streamText({
      model: getModel(providerHeader, modelHeader),
      system: buildSystemPrompt(),
      messages,
      abortSignal: req.signal,
      tools: {
        [TOOL_NAMES.GET_CURRENT_DATE]: tool({
          description:
            'Returns the current date and time. Call this tool whenever the user asks something time-sensitive (e.g. "this month", "this year", "today", "how many months left"). Always call this before making date-based calculations.',
          inputSchema: z.object({}),
          execute: async () => {
            const now = new Date()
            return {
              iso: now.toISOString(),
              date: now.toISOString().slice(0, 10),
              year: now.getFullYear(),
              month: now.getMonth() + 1,
              day: now.getDate(),
            }
          },
        }),
        [TOOL_NAMES.LIST_AVAILABLE_TABS]: tool({
          description:
            'Lists all available tabs/sheets in the Google Spreadsheet. Use this when uncertain about what tabs exist, or when the user mentions a concept you don\'t recognize. Supports optional filtering by name.',
          inputSchema: z.object({
            filter: z
              .string()
              .optional()
              .describe('Optional search term to filter tab names (case-insensitive substring match)'),
          }),
          execute: async ({ filter }) => listTabs(filter),
        }),
        [TOOL_NAMES.GET_SHEET_DATA]: tool({
          description:
            'Carga tabs del Google Sheet del usuario. Llama esta herramienta antes de responder cualquier pregunta sobre datos financieros. Usa list_available_tabs() primero si no estás seguro de qué tabs existen.',
          inputSchema: z.object({
            tabs: z
              .array(z.string())
              .describe(
                'Tabs a cargar. Usa list_available_tabs() primero para ver las opciones disponibles.',
              ),
          }),
          execute: async ({ tabs }) => loadTabs(tabs),
        }),
      },
      maxTokens: 2500,
      stopWhen: stepCountIs(3),
    })

    return result.toUIMessageStreamResponse()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const lowerMsg = message.toLowerCase()
    const statusCode = (err as { status?: number; statusCode?: number }).status
      ?? (err as { status?: number; statusCode?: number }).statusCode

    if (message.includes('AUTH_REQUIRED')) {
      return Response.json(
        { error: 'Sesión expirada. Por favor inicia sesión nuevamente.', code: 'AUTH_REQUIRED' },
        { status: 401 },
      )
    }
    if (statusCode === 401 || lowerMsg.includes('api key') || lowerMsg.includes('api_key') || lowerMsg.includes('authentication failed') || lowerMsg.includes('invalid x-api-key')) {
      return Response.json(
        { error: 'API key inválida o no configurada.', code: 'INVALID_API_KEY' },
        { status: 401 },
      )
    }
    if (statusCode === 429 || lowerMsg.includes('429') || lowerMsg.includes('rate limit') || lowerMsg.includes('quota')) {
      return Response.json(
        { error: 'Límite de uso alcanzado. Intenta en unos minutos.', code: 'RATE_LIMIT' },
        { status: 429 },
      )
    }
    if (lowerMsg.includes('model') && (lowerMsg.includes('not found') || lowerMsg.includes('does not exist'))) {
      return Response.json(
        { error: `Modelo no encontrado. Cambia el modelo en la barra superior.`, code: 'MODEL_NOT_FOUND' },
        { status: 400 },
      )
    }
    return Response.json(
      { error: `Error del servidor: ${message}`, code: 'SERVER_ERROR' },
      { status: 500 },
    )
  }
}
