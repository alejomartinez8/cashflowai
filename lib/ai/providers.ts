import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'

export function getModel(providerOverride?: string, modelOverride?: string) {
  const provider = providerOverride || process.env.AI_PROVIDER || 'anthropic'
  const model = modelOverride || process.env.AI_MODEL || 'claude-sonnet-4-5'
  if (provider === 'openai') return openai(model)
  if (provider === 'google') return google(model)
  return anthropic(model)
}
