import { createOpenRouter } from '@openrouter/ai-sdk-provider';

/**
 * Shared OpenRouter provider instance.
 * Usage: openrouter('google/gemini-3-pro-preview') or openrouter('openai/gpt-5-mini')
 */
export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});
