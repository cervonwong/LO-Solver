import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { INITIAL_HYPOTHESIZER_INSTRUCTIONS } from './02-initial-hypothesizer-instructions';
import { sharedMemory } from './shared-memory';

export const initialHypothesizerAgent = new Agent({
  id: 'wf03-initial-hypothesizer',
  name: '[03-02] Initial Hypothesizer Agent',
  instructions: {
    role: 'system',
    content: INITIAL_HYPOTHESIZER_INSTRUCTIONS,
  },
  // model: 'openrouter/deepseek/deepseek-v3.2',
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
