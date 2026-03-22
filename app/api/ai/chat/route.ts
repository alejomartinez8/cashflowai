import { streamText, tool, stepCountIs, convertToModelMessages } from 'ai'
import { z } from 'zod'
import { auth } from '@/auth'
import { getModel } from '@/lib/ai/providers'
import { buildSystemPrompt } from '@/lib/ai/prompts'
import { loadTabs, listTabs } from '@/lib/sheets/client'

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { messages: uiMessages } = await req.json()
  const messages = await convertToModelMessages(uiMessages) // type says Promise<> at runtime

  const result = await streamText({
    model: getModel(),
    system: buildSystemPrompt(),
    messages,
    tools: {
      list_available_tabs: tool({
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
      get_sheet_data: tool({
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
    stopWhen: stepCountIs(5),
  })

  return result.toUIMessageStreamResponse()
}
