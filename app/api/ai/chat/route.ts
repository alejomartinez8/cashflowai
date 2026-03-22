import { streamText, tool, stepCountIs, convertToModelMessages } from 'ai'
import { z } from 'zod'
import { auth } from '@/auth'
import { getModel } from '@/lib/ai/providers'
import { buildSystemPrompt } from '@/lib/ai/prompts'
import { loadTabs } from '@/lib/sheets/client'
import type { TabName } from '@/lib/types'

const TAB_VALUES = ['2025', '2024', '2023', 'Proyecciones', 'Balance', 'New Home', 'Deudas Banco', 'Prestamos'] as const

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
      get_sheet_data: tool({
        description:
          'Carga tabs del Google Sheet del usuario. Llama esta herramienta antes de responder cualquier pregunta sobre datos financieros.',
        inputSchema: z.object({
          tabs: z.array(z.enum(TAB_VALUES)).describe('Tabs a cargar'),
        }),
        execute: async ({ tabs }) => loadTabs(tabs as TabName[]),
      }),
    },
    stopWhen: stepCountIs(3),
  })

  return result.toUIMessageStreamResponse()
}
