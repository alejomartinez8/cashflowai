import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'

export function getModel(providerOverride?: string, modelOverride?: string) {
  const provider = providerOverride ?? 'anthropic'
  const model = modelOverride ?? 'claude-sonnet-4-6'
  if (provider === 'openai') return openai(model)
  if (provider === 'google') return google(model)
  return anthropic(model)
}
