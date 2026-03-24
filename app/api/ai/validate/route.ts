import { generateText } from 'ai'
import { auth } from '@/auth'
import { getModel } from '@/lib/ai/providers'

export async function GET() {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const provider = process.env.AI_PROVIDER || 'anthropic'
  const model = process.env.AI_MODEL || 'claude-sonnet-4-5'

  try {
    const result = await generateText({
      model: getModel(),
      prompt: 'Reply with only the word "ok".',
      maxTokens: 5,
    })

    return Response.json({
      ok: true,
      provider,
      model,
      response: result.text.trim(),
    })
  } catch (error) {
    return Response.json(
      {
        ok: false,
        provider,
        model,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
