import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { RULES_IMPROVER_INSTRUCTIONS } from './03b-rules-improver-instructions';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { sharedMemory } from './shared-memory';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export const rulesImproverAgent = new Agent({
  name: '[03-3b] Rules Improver Agent',
  instructions: {
    role: 'system',
    content: RULES_IMPROVER_INSTRUCTIONS,
  },
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
