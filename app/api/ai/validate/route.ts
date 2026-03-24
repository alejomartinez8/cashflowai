import { generateText } from 'ai'
import { auth } from '@/auth'
import { getModel } from '@/lib/ai/providers'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = new URL(req.url)
  const provider = searchParams.get('provider') ?? 'anthropic'
  const model = searchParams.get('model') ?? 'claude-sonnet-4-6'

  try {
    const result = await generateText({
      model: getModel(provider, model),
      prompt: 'Reply with only the word "ok".',
      maxOutputTokens: 5,
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
