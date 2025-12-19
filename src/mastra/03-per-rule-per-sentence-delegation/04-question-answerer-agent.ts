import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { QUESTION_ANSWERER_INSTRUCTIONS } from './04-question-answerer-instructions';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { sharedMemory } from './shared-memory';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export const questionAnswererAgent = new Agent({
  name: '[03-04] Question Answerer Agent',
  instructions: QUESTION_ANSWERER_INSTRUCTIONS,
  // model: openrouter('openai/gpt-5-mini'),
  model: openrouter('google/gemini-3-pro-preview'),
  tools: {},
  inputProcessors: [
    new UnicodeNormalizer({
      stripControlChars: false,
      preserveEmojis: true,
      collapseWhitespace: true,
      trim: true,
    }),
  ],
  memory: sharedMemory,
});
