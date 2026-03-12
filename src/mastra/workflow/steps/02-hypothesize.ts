import { z } from 'zod';
import { createStep } from '@mastra/core/workflows';
import { RequestContext } from '@mastra/core/request-context';
import { type VocabularyEntry } from '../vocabulary-tools';
import type { WorkflowRequestContext, DraftStore, StepWriter } from '../request-context-types';
import type { Rule } from '../request-context-types';
import type { ProviderMode } from '../../openrouter';
import { createOpenRouterProvider } from '../../openrouter';
import type { StepTiming } from '../logging-utils';
import { formatTimestamp, logVerificationResults } from '../logging-utils';
import { emitTraceEvent, clearAllDraftStores } from '../request-context-helpers';
import type { StepId } from '@/lib/workflow-events';
import { createMcpToolServer } from '../../mcp/mcp-tool-bridge';
import { createClaudeCode } from 'ai-sdk-provider-claude-code';
import { CLAUDE_CODE_DISALLOWED_TOOLS } from '../../claude-code-provider';
import type { Mastra } from '@mastra/core/mastra';
import {
  workflowStateSchema,
  structuredProblemDataSchema,
  questionAnsweringInputSchema,
  verifierFeedbackSchema,
  type Perspective,
  type PerspectiveResult,
  type RoundResult,
  type VerificationMetadata,
} from '../workflow-schemas';
import { runDispatch } from './02a-dispatch';
import { runHypothesize } from './02b-hypothesize';
import { runVerify } from './02c-verify';
import { runSynthesize } from './02d-synthesize';

export type { StepTiming } from '../logging-utils';

/**
 * Attach a per-execution Claude Code provider with MCP tools to a RequestContext.
 * Only activates when providerMode is 'claude-code'; no-op otherwise.
 * Must be called AFTER all RequestContext keys are set (tool handlers read them via closure).
 */
export function attachMcpProvider(
  rc: RequestContext<WorkflowRequestContext>,
  mastra: Mastra,
  providerMode: ProviderMode,
  testToolMode: 'committed' | 'draft',
): void {
  if (providerMode !== 'claude-code') return;
  const mcpServer = createMcpToolServer(rc, mastra, { testToolMode });
  const provider = createClaudeCode({
    defaultSettings: {
      disallowedTools: [...CLAUDE_CODE_DISALLOWED_TOOLS],
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxToolResultSize: 50000,
      mcpServers: {
        'lo-solver-tools': mcpServer,
      },
    },
  });
  rc.set('claude-code-provider', provider);
}

/** Shared context carrying references to main stores and immutable problem data. Maps are passed by reference (STR-03). */
export interface HypothesizeContext {
  structuredProblem: z.infer<typeof structuredProblemDataSchema>;
  mainVocabulary: Map<string, VocabularyEntry>;
  mainRules: Map<string, Rule>;
  draftStores: Map<string, DraftStore>;
  mainRequestContext: RequestContext<WorkflowRequestContext>;
  logFile: string;
  providerMode: ProviderMode;
  stepId: StepId;
  effectivePerspectiveCount: number;
  workflowStartTime: number;
}
/** Mastra framework params, separate from application state. */
export interface StepParams {
  mastra: Mastra;
  writer: StepWriter;
  bail: (value: any) => any;
  setState: (state: any) => Promise<void>;
  abortSignal?: AbortSignal;
}
export interface DispatchResult {
  perspectives: Perspective[] | null;
  error?: string;
  timings: StepTiming[];
}
export interface HypothesizeResult {
  results: Array<{ perspective: Perspective; draftStore: DraftStore; timing: StepTiming }>;
  timings: StepTiming[];
}
export interface VerifyResult {
  perspectiveResults: PerspectiveResult[];
  timings: StepTiming[];
}
export interface SynthesizeResult {
  convergencePassRate: number;
  convergenceConclusion: 'ALL_RULES_PASS' | 'NEEDS_IMPROVEMENT' | 'MAJOR_ISSUES';
  converged: boolean;
  convergenceFeedback: z.infer<typeof verifierFeedbackSchema> | null;
  timings: StepTiming[];
}

// Step 2: Multi-perspective hypothesis generation
// Implements dispatch -> hypothesize (parallel) -> verify -> synthesize loop
export const multiPerspectiveHypothesisStep = createStep({
  id: 'multi-perspective-hypothesis',
  description:
    'Step 2: Generate rules via multi-perspective dispatch, parallel hypothesis, verification, and synthesis.',
  inputSchema: structuredProblemDataSchema,
  outputSchema: questionAnsweringInputSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, mastra, bail, state, setState, writer, abortSignal }) => {
    const structuredProblem = inputData;
    const logFile = state.logFile;
    const stepId: StepId = 'multi-perspective-hypothesis';
    let currentStepTimings = [...state.stepTimings];
    await emitTraceEvent(writer, {
      type: 'data-step-start',
      data: { stepId, timestamp: new Date().toISOString() },
    });
    const stepStartTime = new Date();
    const effectiveMaxRounds =
      state.providerMode === 'openrouter-testing' ? Math.min(state.maxRounds, 2) : state.maxRounds;
    const effectivePerspectiveCount =
      state.providerMode === 'openrouter-testing' ? Math.min(state.perspectiveCount, 2) : state.perspectiveCount;

    // Initialize main RequestContext with empty main stores
    const mainRequestContext = new RequestContext<WorkflowRequestContext>();
    const mainVocabulary = new Map<string, VocabularyEntry>();
    const mainRules = new Map<string, Rule>();
    const draftStores = new Map<string, DraftStore>();
    mainRequestContext.set('vocabulary-state', mainVocabulary);
    mainRequestContext.set('rules-state', mainRules);
    mainRequestContext.set('draft-stores', draftStores);
    mainRequestContext.set('structured-problem', structuredProblem);
    mainRequestContext.set('log-file', logFile);
    mainRequestContext.set('provider-mode', state.providerMode as ProviderMode);
    mainRequestContext.set('step-writer', writer);
    mainRequestContext.set('step-id', stepId);
    mainRequestContext.set('workflow-start-time', state.workflowStartTime);
    mainRequestContext.set('abort-signal', abortSignal);
    mainRequestContext.set('cumulative-cost', 0);
    if (state.apiKey)
      mainRequestContext.set('openrouter-provider', createOpenRouterProvider(state.apiKey));

    let lastTestResults: unknown = null;
    let previousPerspectiveIds: string[] = [];
    const roundResults: RoundResult[] = [];
    let bestRound = 0,
      bestPassRate = 0;
    let finalConclusion: 'ALL_RULES_PASS' | 'NEEDS_IMPROVEMENT' | 'MAJOR_ISSUES' = 'MAJOR_ISSUES';
    let finalFeedback: z.infer<typeof verifierFeedbackSchema> | null = null;

    const ctx: HypothesizeContext = {
      structuredProblem,
      mainVocabulary,
      mainRules,
      draftStores,
      mainRequestContext,
      logFile,
      providerMode: state.providerMode as ProviderMode,
      stepId,
      effectivePerspectiveCount,
      workflowStartTime: state.workflowStartTime,
    };
    const stepParams: StepParams = { mastra, writer, bail, setState, abortSignal };

    for (let round = 1; round <= effectiveMaxRounds; round++) {
      if (abortSignal?.aborted) {
        console.log(
          `${formatTimestamp(state.workflowStartTime)} [Round ${round}] Abort signal detected, stopping iteration.`,
        );
        break;
      }
      const isImproverRound = round > 1;
      await emitTraceEvent(writer, {
        type: 'data-round-start',
        data: { round, isImproverRound, timestamp: new Date().toISOString() },
      });

      // a. DISPATCH
      const dispatchResult = await runDispatch(
        ctx,
        stepParams,
        round,
        isImproverRound,
        lastTestResults,
        previousPerspectiveIds,
      );
      currentStepTimings.push(...dispatchResult.timings);
      if (!dispatchResult.perspectives) {
        if (isImproverRound) break;
        return bail({ success: false, message: dispatchResult.error ?? 'Dispatch failed' });
      }
      const perspectives = dispatchResult.perspectives;
      previousPerspectiveIds.push(...perspectives.map((p) => p.id));

      // b. HYPOTHESIZE
      if (abortSignal?.aborted) break;
      const hypResult = await runHypothesize(ctx, stepParams, round, isImproverRound, perspectives);
      currentStepTimings.push(...hypResult.timings);

      // c. VERIFY
      if (abortSignal?.aborted) break;
      const verifyResult = await runVerify(ctx, stepParams, round, hypResult.results);
      currentStepTimings.push(...verifyResult.timings);

      // d. SYNTHESIZE + CONVERGENCE
      if (abortSignal?.aborted) break;
      const synthResult = await runSynthesize(
        ctx,
        stepParams,
        round,
        perspectives,
        verifyResult.perspectiveResults,
      );
      currentStepTimings.push(...synthResult.timings);

      // Coordinator accumulation
      roundResults.push({
        round,
        perspectives: verifyResult.perspectiveResults.map((r) => ({
          perspectiveId: r.perspectiveId,
          perspectiveName: r.perspectiveName,
          testPassRate: r.testPassRate,
          verifierConclusion: r.verifierConclusion,
          rulesCount: r.rulesCount,
          errantRulesCount: r.errantRulesCount,
          errantSentencesCount: r.errantSentencesCount,
        })),
        convergencePassRate: synthResult.convergencePassRate,
        convergenceConclusion: synthResult.convergenceConclusion,
        converged: synthResult.converged,
      });
      if (synthResult.convergencePassRate > bestPassRate) {
        bestPassRate = synthResult.convergencePassRate;
        bestRound = round;
      }
      finalConclusion = synthResult.convergenceConclusion;
      finalFeedback = synthResult.convergenceFeedback;
      lastTestResults = synthResult.convergenceFeedback;

      if (synthResult.convergenceFeedback) {
        const fb = synthResult.convergenceFeedback;
        await emitTraceEvent(writer, {
          type: 'data-iteration-update',
          data: {
            iteration: round,
            conclusion: fb.conclusion,
            rulesTestedCount: fb.rulesTestedCount,
            errantRulesCount: fb.errantRules.length,
            sentencesTestedCount: fb.sentencesTestedCount,
            errantSentencesCount: fb.errantSentences.length,
            errantRules: fb.errantRules,
            errantSentences: fb.errantSentences,
            passRate: synthResult.convergencePassRate,
            timestamp: new Date().toISOString(),
          },
        });
        logVerificationResults(
          logFile,
          `Round ${round}: Convergence Verification`,
          fb,
          Array.from(mainRules.keys()),
          state.workflowStartTime,
        );
      }

      await emitTraceEvent(writer, {
        type: 'data-round-complete',
        data: { round, converged: synthResult.converged, timestamp: new Date().toISOString() },
      });
      await setState({
        ...state,
        vocabulary: Object.fromEntries(mainVocabulary),
        rules: Object.fromEntries(mainRules),
        currentRound: round,
        stepTimings: currentStepTimings,
      });

      if (synthResult.converged) {
        console.log(
          `${formatTimestamp(state.workflowStartTime)} [Round ${round}] Converged! All rules pass.`,
        );
        break;
      }
      clearAllDraftStores(mainRequestContext);
    }

    // Post-loop: return structuredProblem + rules for answering step
    const finalRules = Array.from(mainRules.values());
    if (!roundResults.some((r) => r.converged)) {
      console.warn(
        `${formatTimestamp(state.workflowStartTime)} [Multi-Perspective] Max rounds (${effectiveMaxRounds}) reached without convergence. Best pass rate: ${bestPassRate.toFixed(2)} (round ${bestRound}). Using best-so-far rules.`,
      );
      await emitTraceEvent(writer, {
        type: 'data-iteration-update',
        data: {
          iteration: effectiveMaxRounds,
          conclusion: finalConclusion,
          rulesTestedCount: finalFeedback?.rulesTestedCount ?? 0,
          errantRulesCount: finalFeedback?.errantRules.length ?? 0,
          sentencesTestedCount: finalFeedback?.sentencesTestedCount ?? 0,
          errantSentencesCount: finalFeedback?.errantSentences.length ?? 0,
          errantRules: finalFeedback?.errantRules ?? [],
          errantSentences: finalFeedback?.errantSentences ?? [],
          passRate: bestPassRate,
          isConvergenceWarning: true,
          timestamp: new Date().toISOString(),
        },
      });
    }
    const verificationMetadata: VerificationMetadata = {
      totalRounds: roundResults.length,
      converged: roundResults.some((r) => r.converged),
      bestRound,
      bestPassRate,
      finalConclusion,
      rounds: roundResults,
      finalRulesCount: finalFeedback?.rulesTestedCount ?? finalRules.length,
      finalErrantRulesCount: finalFeedback?.errantRules.length ?? 0,
      finalSentencesTestedCount: finalFeedback?.sentencesTestedCount ?? 0,
      finalErrantSentencesCount: finalFeedback?.errantSentences.length ?? 0,
    };
    await emitTraceEvent(writer, {
      type: 'data-step-complete',
      data: {
        stepId,
        durationMs: new Date().getTime() - stepStartTime.getTime(),
        timestamp: new Date().toISOString(),
      },
    });
    return { structuredProblem, rules: finalRules, verificationMetadata };
  },
});
