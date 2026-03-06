import { createOpenRouter } from '@openrouter/ai-sdk-provider';

/** Provider routing for gpt-oss models: prefer clarifai/fp4, then google-vertex. */
const GPT_OSS_PROVIDER_ORDER = ['clarifai/fp4', 'google-vertex'];

/** Type for a wrapped OpenRouter provider with gpt-oss routing and usage tracking. */
export type OpenRouterProvider = ReturnType<typeof createOpenRouter>;

/**
 * Wrap a base OpenRouter provider with gpt-oss routing and usage tracking.
 * Both the singleton and per-request providers use this to ensure identical behavior.
 */
function wrapProvider(base: ReturnType<typeof createOpenRouter>): typeof base {
  return ((modelId: string, settings?: object) => {
    // Enable usage accounting on all models so OpenRouter includes cost in responses
    const baseSettings = { usage: { include: true }, ...settings };
    if (modelId.includes('gpt-oss')) {
      return base(modelId, {
        ...baseSettings,
        provider: { order: GPT_OSS_PROVIDER_ORDER },
      });
    }
    return base(modelId, baseSettings);
  }) as typeof base;
}

const openrouterBase = process.env.OPENROUTER_API_KEY
  ? createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })
  : undefined;

/**
 * Shared OpenRouter provider instance with automatic provider routing.
 * gpt-oss models are routed to clarifai/fp4 first, then google-vertex.
 * May be undefined if OPENROUTER_API_KEY is not set (user key required).
 */
export const openrouter = openrouterBase ? wrapProvider(openrouterBase) : (undefined as unknown as OpenRouterProvider);

/**
 * Create a per-request OpenRouter provider from a user-supplied API key.
 * The returned provider has identical gpt-oss routing and usage tracking as the singleton.
 */
export function createOpenRouterProvider(apiKey: string): OpenRouterProvider {
  const base = createOpenRouter({ apiKey });
  return wrapProvider(base);
}

/** Model mode for switching between cheap testing and production models. */
export type ModelMode = 'testing' | 'production';

/** Cheap model used by all agents in testing mode. */
export const TESTING_MODEL = 'openai/gpt-oss-120b';

/** Returns the actual model ID being used given the current mode and the production model. */
export function activeModelId(mode: ModelMode, productionModel: string): string {
  return mode === 'production' ? productionModel : TESTING_MODEL;
}
