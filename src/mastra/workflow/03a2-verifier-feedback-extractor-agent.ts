import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { VERIFIER_FEEDBACK_EXTRACTOR_INSTRUCTIONS } from './03a2-verifier-feedback-extractor-instructions';
import { openrouter, TESTING_MODEL } from '../openrouter';

export const verifierFeedbackExtractorAgent = new Agent({
  id: 'verifier-feedback-extractor',
  name: '[Step 3] Verifier Feedback Extractor Agent',
  instructions: {
    role: 'system',
    content: VERIFIER_FEEDBACK_EXTRACTOR_INSTRUCTIONS,
  },
  model: ({ requestContext }) =>
    openrouter(
      requestContext?.get('model-mode') === 'production' ? 'openai/gpt-5-mini' : TESTING_MODEL,
    ),
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
