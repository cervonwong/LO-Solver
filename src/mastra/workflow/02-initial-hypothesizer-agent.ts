import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { INITIAL_HYPOTHESIZER_INSTRUCTIONS } from './02-initial-hypothesizer-instructions';
import { RULES_TOOLS_INSTRUCTIONS } from './rules-tools-prompt';
import { VOCABULARY_TOOLS_INSTRUCTIONS } from './vocabulary-tools-prompt';
import { openrouter, TESTING_MODEL } from '../openrouter';
import { rulesTools } from './rules-tools';
import { vocabularyTools } from './vocabulary-tools';

// Inject the tool instructions into the prompt
const instructions = INITIAL_HYPOTHESIZER_INSTRUCTIONS.replace(
  '{{RULES_TOOLS_INSTRUCTIONS}}',
  RULES_TOOLS_INSTRUCTIONS,
).replace('{{VOCABULARY_TOOLS_INSTRUCTIONS}}', VOCABULARY_TOOLS_INSTRUCTIONS);

/**
 * Initial Hypothesizer Agent - generates rules and vocabulary from structured problem.
 * Uses rules and vocabulary CRUD tools that read state from requestContext.
 * Testing is handled by the separate verification step after hypothesis generation.
 */
export const initialHypothesizerAgent = new Agent({
  id: 'initial-hypothesizer',
  name: '[Step 2] Initial Hypothesizer Agent',
  instructions: {
    role: 'system',
    content: instructions,
  },
  model: ({ requestContext }) =>
    openrouter(
      requestContext?.get('model-mode') === 'production'
        ? 'google/gemini-3-flash-preview'
        : TESTING_MODEL,
    ),
  tools: {
    ...vocabularyTools,
    ...rulesTools,
  },
  inputProcessors: [
    new UnicodeNormalizer({
      stripControlChars: false,
      preserveEmojis: true,
      collapseWhitespace: true,
      trim: true,
    }),
  ],
});
