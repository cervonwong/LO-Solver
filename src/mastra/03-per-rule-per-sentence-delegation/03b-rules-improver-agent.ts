import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { RULES_IMPROVER_INSTRUCTIONS } from './03b-rules-improver-instructions';
import { sharedMemory } from './shared-memory';

export const rulesImproverAgent = new Agent({
  id: 'wf03-rules-improver',
  name: '[03-3b] Rules Improver Agent',
  instructions: {
    role: 'system',
    content: RULES_IMPROVER_INSTRUCTIONS,
  },
  model: 'openrouter/google/gemini-3-pro-preview',
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
