import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { VERIFIER_FEEDBACK_EXTRACTOR_INSTRUCTIONS } from './03a2-verifier-feedback-extractor-instructions';
import { openrouter } from '../openrouter';

export const verifierFeedbackExtractorAgent = new Agent({
  id: 'wf03-verifier-feedback-extractor',
  name: '[03-3a2] Verifier Feedback Extractor Agent',
  instructions: {
    role: 'system',
    content: VERIFIER_FEEDBACK_EXTRACTOR_INSTRUCTIONS,
  },
  model: openrouter('moonshotai/kimi-k2.5'),
  tools: {},
  inputProcessors: [
    new UnicodeNormalizer({
      stripControlChars: false,
      preserveEmojis: true,
      collapseWhitespace: true,
      trim: true,
    }),
  ],
});
