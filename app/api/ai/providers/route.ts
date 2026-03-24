import { auth } from '@/auth'
import type { ModelOption } from '@/hooks/use-model-preference'

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

const providerCache = new Map<string, { models: ModelOption[]; ts: number }>()


async function fetchAnthropicModels(): Promise<ModelOption[]> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return []

  const cached = providerCache.get('anthropic')
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.models

  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    })
    if (!res.ok) return []
    const { data } = (await res.json()) as {
      data: { id: string; display_name: string; context_window: number }[]
    }
    const models: ModelOption[] = (data ?? []).map((m) => ({
      provider: 'anthropic',
      model: m.id,
      label: m.display_name ?? m.id,
      contextWindow: m.context_window ?? 200_000,
    }))
    providerCache.set('anthropic', { models, ts: Date.now() })
    return models
  } catch {
    return []
  }
}

async function fetchOpenAIModels(): Promise<ModelOption[]> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return []

  const cached = providerCache.get('openai')
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.models

  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) return []
    const { data } = (await res.json()) as { data: { id: string; created: number }[] }
    const models: ModelOption[] = (data ?? [])
      .filter((m) => /^(gpt-4|o1|o3|o4)/.test(m.id))
      .sort((a, b) => b.created - a.created)
      .map((m) => ({
        provider: 'openai',
        model: m.id,
        label: m.id,
        contextWindow: 0, // OpenAI API doesn't return context window info
      }))
    providerCache.set('openai', { models, ts: Date.now() })
    return models
  } catch {
    return []
  }
}

async function fetchGoogleModels(): Promise<ModelOption[]> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!key) return []

  const cached = providerCache.get('google')
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.models

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
    )
    if (!res.ok) return []
    const { models: raw } = (await res.json()) as {
      models: {
        name: string
        displayName: string
        supportedGenerationMethods: string[]
        inputTokenLimit: number
      }[]
    }
    const models: ModelOption[] = (raw ?? [])
      .filter(
        (m) =>
          m.name.includes('gemini') &&
          m.supportedGenerationMethods?.includes('generateContent'),
      )
      .map((m) => {
        const id = m.name.replace('models/', '')
        return {
          provider: 'google',
          model: id,
          label: m.displayName ?? id,
          contextWindow: m.inputTokenLimit ?? 1_048_576,
        }
      })
    providerCache.set('google', { models, ts: Date.now() })
    return models
  } catch {
    return []
  }
}

export async function GET() {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const [anthropic, openai, google] = await Promise.all([
    fetchAnthropicModels(),
    fetchOpenAIModels(),
    fetchGoogleModels(),
  ])

  return Response.json([...anthropic, ...openai, ...google])
}
