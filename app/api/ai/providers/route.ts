import { auth } from '@/auth'
import type { ModelOption } from '@/hooks/use-model-preference'

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

const providerCache = new Map<string, { models: ModelOption[]; ts: number }>()

const CONTEXT_WINDOWS: Record<string, number> = {
  // Anthropic
  'claude-opus-4-6': 200_000,
  'claude-sonnet-4-6': 200_000,
  'claude-haiku-4-5-20251001': 200_000,
  'claude-3-5-sonnet-20241022': 200_000,
  'claude-3-5-haiku-20241022': 200_000,
  'claude-3-opus-20240229': 200_000,
  // OpenAI
  'gpt-4o': 128_000,
  'gpt-4o-mini': 128_000,
  'gpt-4-turbo': 128_000,
  'o1': 200_000,
  'o1-mini': 128_000,
  'o3': 200_000,
  'o3-mini': 200_000,
  'o4-mini': 200_000,
  // Google
  'gemini-2.0-flash': 1_048_576,
  'gemini-2.0-flash-lite': 1_048_576,
  'gemini-1.5-pro': 2_097_152,
  'gemini-1.5-flash': 1_048_576,
  'gemini-2.5-pro': 1_048_576,
  'gemini-2.5-flash': 1_048_576,
}

const DEFAULT_CTX: Record<string, number> = {
  anthropic: 200_000,
  openai: 128_000,
  google: 1_048_576,
}

function ctxFor(provider: string, id: string): number {
  return CONTEXT_WINDOWS[id] ?? DEFAULT_CTX[provider] ?? 128_000
}

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
    const { data } = (await res.json()) as { data: { id: string; display_name: string }[] }
    const models: ModelOption[] = (data ?? []).map((m) => ({
      provider: 'anthropic',
      model: m.id,
      label: m.display_name ?? m.id,
      contextWindow: ctxFor('anthropic', m.id),
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
        contextWindow: ctxFor('openai', m.id),
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
      models: { name: string; displayName: string; supportedGenerationMethods: string[] }[]
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
          contextWindow: ctxFor('google', id),
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
