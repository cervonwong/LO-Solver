import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { INITIAL_HYPOTHESIZER_INSTRUCTIONS } from './02-initial-hypothesizer-instructions';
import { VOCABULARY_TOOLS_INSTRUCTIONS } from './vocabulary-tools-prompt';
import { openrouter } from '../openrouter';
import type { VocabularyTools } from './vocabulary-tools';

/**
 * Factory function to create an Initial Hypothesizer Agent with vocabulary tools.
 * Vocabulary tools allow the agent to manage vocabulary entries during analysis.
 */
export function createInitialHypothesizerAgent(vocabularyTools: VocabularyTools) {
  // Inject the vocabulary tools instructions into the prompt
  const instructions = INITIAL_HYPOTHESIZER_INSTRUCTIONS.replace(
    '{{VOCABULARY_TOOLS_INSTRUCTIONS}}',
    VOCABULARY_TOOLS_INSTRUCTIONS,
  );

  return new Agent({
    id: 'wf03-initial-hypothesizer',
    name: '[03-02] Initial Hypothesizer Agent',
    instructions: {
      role: 'system',
      content: instructions,
    },
    // model: openrouter('google/gemini-3-pro-preview'),
    model: openrouter('google/gemini-3-flash-preview'),
    tools: {
      getVocabulary: vocabularyTools.getVocabulary,
      addVocabulary: vocabularyTools.addVocabulary,
      updateVocabulary: vocabularyTools.updateVocabulary,
      removeVocabulary: vocabularyTools.removeVocabulary,
      clearVocabulary: vocabularyTools.clearVocabulary,
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
}
