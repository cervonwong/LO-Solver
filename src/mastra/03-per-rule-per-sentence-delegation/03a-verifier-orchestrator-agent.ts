import { Agent } from '@mastra/core/agent';
import { UnicodeNormalizer } from '@mastra/core/processors';
import { VERIFIER_ORCHESTRATOR_INSTRUCTIONS } from './03a-verifier-orchestrator-instructions';
import { sharedMemory } from './shared-memory';

/**
 * Factory function to create a verifier orchestrator agent with dynamic tools.
 * Tools are created per-iteration with the current context baked in.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createVerifierOrchestratorAgent(tools: Record<string, any>) {
  return new Agent({
    id: 'wf03-verifier-orchestrator',
    name: '[03-3a] Verifier Orchestrator Agent',
    instructions: VERIFIER_ORCHESTRATOR_INSTRUCTIONS,
    model: 'openrouter/google/gemini-3-pro-preview',
    tools,
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
}
