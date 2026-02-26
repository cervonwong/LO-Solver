import { createOpenRouter } from '@openrouter/ai-sdk-provider';

/**
 * Shared OpenRouter provider instance.
 * Usage: openrouter('google/gemini-3-pro-preview') or openrouter('openai/gpt-5-mini')
 */
export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

/** Model mode for switching between cheap testing and production models. */
export type ModelMode = 'testing' | 'production';

/** Cheap model used by all agents in testing mode. */
export const TESTING_MODEL = 'amazon/nova-micro-v1';
