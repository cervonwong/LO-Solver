import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { RULES_IMPROVER_INSTRUCTIONS } from './03b-rules-improver-instructions';
import { VOCABULARY_TOOLS_INSTRUCTIONS } from './vocabulary-tools-prompt';
import { openrouter } from '../openrouter';
import type { VocabularyTools } from './vocabulary-tools';

/**
 * Factory function to create a Rules Improver Agent with vocabulary tools.
 * Vocabulary tools allow the agent to update vocabulary entries during rule revision.
 */
export function createRulesImproverAgent(vocabularyTools: VocabularyTools) {
  // Inject the vocabulary tools instructions into the prompt
  const instructions = RULES_IMPROVER_INSTRUCTIONS.replace(
    '{{VOCABULARY_TOOLS_INSTRUCTIONS}}',
    VOCABULARY_TOOLS_INSTRUCTIONS,
  );

  return new Agent({
    id: 'wf03-rules-improver',
    name: '[03-3b] Rules Improver Agent',
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
