import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'

export function getModel(providerOverride?: string, modelOverride?: string) {
  const provider = providerOverride || 'google'
  const model = modelOverride || 'gemini-3.1-pro-preview'
  if (provider === 'openai') return openai(model)
  if (provider === 'google') return google(model)
  return anthropic(model)
}
