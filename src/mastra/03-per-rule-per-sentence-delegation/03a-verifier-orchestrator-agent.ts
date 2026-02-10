import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { VERIFIER_ORCHESTRATOR_INSTRUCTIONS } from './03a-verifier-orchestrator-instructions';
import { openrouter } from '../openrouter';
import { testRuleTool } from './03a-rule-tester-tool';
import { testSentenceTool } from './03a-sentence-tester-tool';

/**
 * Verifier Orchestrator Agent - tests rules and sentences against the dataset.
 * Uses static tester tools that read context from requestContext.
 */
export const verifierOrchestratorAgent = new Agent({
  id: 'wf03-verifier-orchestrator',
  name: '[03-3a] Verifier Orchestrator Agent',
  instructions: VERIFIER_ORCHESTRATOR_INSTRUCTIONS,
  model: openrouter('moonshotai/kimi-k2.5'),
  tools: {
    testRule: testRuleTool,
    testSentence: testSentenceTool,
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
