import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import { groq } from '@ai-sdk/groq'

export function getModel(providerOverride?: string, modelOverride?: string) {
  const provider = providerOverride || 'groq'
  const model = modelOverride || 'llama-3.3-70b-versatile'
  if (provider === 'openai') return openai(model)
  if (provider === 'google') return google(model)
  if (provider === 'groq') return groq(model)
  return anthropic(model)
}
