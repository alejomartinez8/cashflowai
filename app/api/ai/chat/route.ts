import { streamText, stepCountIs, tool } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/ai/providers'
import { buildSystemPrompt } from '@/lib/ai/prompts'
import { loadTabs } from '@/lib/sheets/client'
import { TABS, type TabName } from '@/lib/types'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: getModel(),
    system: buildSystemPrompt(),
    messages,
    tools: {
      get_sheet_data: tool({
        description: 'Fetch data from one or more Google Sheets tabs',
        parameters: z.object({
          tabs: z
            .array(z.enum(TABS))
            .describe('Tab names to fetch'),
        }),
        execute: async ({ tabs }) => {
          const data = await loadTabs(tabs as TabName[])
          return data
        },
      }),
    },
    stopWhen: stepCountIs(3),
  })

  return result.toUIMessageStreamResponse()
}
