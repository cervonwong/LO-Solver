import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouterBase = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

/** Provider routing for gpt-oss models: prefer clarifai/fp4, then google-vertex. */
const GPT_OSS_PROVIDER_ORDER = ['clarifai/fp4', 'google-vertex'];

/**
 * Shared OpenRouter provider instance with automatic provider routing.
 * gpt-oss models are routed to clarifai/fp4 first, then google-vertex.
 */
export const openrouter: typeof openrouterBase = ((modelId: string, settings?: object) => {
  // Enable usage accounting on all models so OpenRouter includes cost in responses
  const baseSettings = { usage: { include: true }, ...settings };
  if (modelId.includes('gpt-oss')) {
    return openrouterBase(modelId, {
      ...baseSettings,
      provider: { order: GPT_OSS_PROVIDER_ORDER },
    });
  }
  return openrouterBase(modelId, baseSettings);
}) as typeof openrouterBase;

/** Model mode for switching between cheap testing and production models. */
export type ModelMode = 'testing' | 'production';

/** Cheap model used by all agents in testing mode. */
export const TESTING_MODEL = 'openai/gpt-oss-120b';

/** Returns the actual model ID being used given the current mode and the production model. */
export function activeModelId(mode: ModelMode, productionModel: string): string {
  return mode === 'production' ? productionModel : TESTING_MODEL;
}
