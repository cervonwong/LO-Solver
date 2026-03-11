import type { HypothesizeContext, StepParams, HypothesizeResult } from './02-hypothesize';
import type { StepTiming } from '../logging-utils';
import type { Perspective } from '../workflow-schemas';
import type { WorkflowRequestContext } from '../request-context-types';
import { RequestContext } from '@mastra/core/request-context';
import { streamWithRetry } from '../agent-utils';
import {
  emitTraceEvent,
  createDraftStore,
  extractCostFromResult,
  updateCumulativeCost,
} from '../request-context-helpers';
import { recordStepTiming, logAgentOutput, formatTimestamp } from '../logging-utils';
import { activeModelId } from '../../openrouter';
import { generateEventId } from '@/lib/workflow-events';

/**
 * Hypothesize sub-phase: run hypothesizer agents in parallel, one per perspective.
 * Each perspective gets its own draft store and request context for isolation.
 */
export async function runHypothesize(
  ctx: HypothesizeContext,
  params: StepParams,
  round: number,
  isImproverRound: boolean,
  perspectives: Perspective[],
): Promise<HypothesizeResult> {
  const hypothesizePromises = perspectives.map(async (perspective) => {
    await emitTraceEvent(params.writer, {
      type: 'data-perspective-start',
      data: {
        perspectiveId: perspective.id,
        perspectiveName: perspective.name,
        round,
        timestamp: new Date().toISOString(),
      },
    });

    // Create a draft store for this perspective
    const draftStore = createDraftStore(
      ctx.mainRequestContext,
      perspective.id,
      isImproverRound, // pull from main on round 2+
    );

    // Create a fresh RequestContext pointing to this perspective's draft stores
    const perspectiveRequestContext = new RequestContext<WorkflowRequestContext>();
    perspectiveRequestContext.set('vocabulary-state', draftStore.vocabulary);
    perspectiveRequestContext.set('rules-state', draftStore.rules);
    perspectiveRequestContext.set('structured-problem', ctx.structuredProblem);
    perspectiveRequestContext.set('log-file', ctx.logFile);
    perspectiveRequestContext.set('provider-mode', ctx.providerMode);
    perspectiveRequestContext.set('step-writer', params.writer);
    perspectiveRequestContext.set('step-id', ctx.stepId);
    perspectiveRequestContext.set('event-source', 'draft');
    perspectiveRequestContext.set('workflow-start-time', ctx.workflowStartTime);
    perspectiveRequestContext.set('abort-signal', params.abortSignal);
    const mainProvider = ctx.mainRequestContext.get('openrouter-provider');
    if (mainProvider) perspectiveRequestContext.set('openrouter-provider', mainProvider);

    const existingRules = isImproverRound ? Array.from(ctx.mainRules.values()) : [];
    const existingVocabulary = isImproverRound
      ? Array.from(ctx.mainVocabulary.values())
      : [];

    const hypothesizerPrompt = JSON.stringify({
      structuredProblem: ctx.structuredProblem,
      perspective,
      existingRules,
      existingVocabulary,
    });

    const hypAgentId = generateEventId();
    await emitTraceEvent(params.writer, {
      type: 'data-agent-start',
      data: {
        id: hypAgentId,
        perspectiveId: perspective.id,
        stepId: ctx.stepId,
        agentName: `Hypothesizer (${perspective.name})`,
        model: activeModelId(ctx.providerMode, 'google/gemini-3-flash-preview'),
        task: hypothesizerPrompt.slice(0, 500),
        timestamp: new Date().toISOString(),
      },
    });

    perspectiveRequestContext.set('parent-agent-id', hypAgentId);
    const hypStartTime = new Date();
    const hypothesizerResponse = await streamWithRetry(
      params.mastra.getAgentById('initial-hypothesizer'),
      {
        prompt: hypothesizerPrompt,
        ...(params.abortSignal && { abortSignal: params.abortSignal }),
        options: { maxSteps: 100, requestContext: perspectiveRequestContext },
        responseCheck: 'toolActivity',
        onTextChunk: (chunk) => {
          emitTraceEvent(params.writer, {
            type: 'data-agent-text-chunk',
            data: {
              parentId: hypAgentId,
              text: chunk,
              timestamp: new Date().toISOString(),
            },
          });
        },
      },
    );
    const hypDurationMs = new Date().getTime() - hypStartTime.getTime();
    perspectiveRequestContext.set('parent-agent-id', undefined);

    // Track API cost (accumulates on mainRequestContext across all perspectives)
    const hypCost = extractCostFromResult(hypothesizerResponse);
    await updateCumulativeCost(ctx.mainRequestContext, params.writer, hypCost);

    await emitTraceEvent(params.writer, {
      type: 'data-agent-end',
      data: {
        id: hypAgentId,
        perspectiveId: perspective.id,
        stepId: ctx.stepId,
        agentName: `Hypothesizer (${perspective.name})`,
        reasoning: hypothesizerResponse.text || '',
        durationMs: hypDurationMs,
        attempt: 1,
        totalAttempts: 1,
        timestamp: new Date().toISOString(),
      },
    });

    const hypTiming = recordStepTiming(
      `Round ${round} Hypothesizer (${perspective.id})`,
      'Initial Hypothesizer Agent',
      hypStartTime,
    );
    console.log(
      `${formatTimestamp(ctx.workflowStartTime)} [Round ${round}] Hypothesizer (${perspective.id}) finished at ${hypTiming.endTime} (${hypTiming.durationMinutes} min).`,
    );

    logAgentOutput(
      ctx.logFile,
      `Round ${round}: Hypothesizer (${perspective.id})`,
      'Initial Hypothesizer Agent',
      { naturalLanguageOutput: hypothesizerResponse.text },
      hypothesizerResponse.reasoningText,
      ctx.workflowStartTime,
    );

    await emitTraceEvent(params.writer, {
      type: 'data-perspective-complete',
      data: {
        perspectiveId: perspective.id,
        perspectiveName: perspective.name,
        round,
        testPassRate: 0, // Will be computed during verification
        rulesCount: draftStore.rules.size,
        vocabularyCount: draftStore.vocabulary.size,
        timestamp: new Date().toISOString(),
      },
    });

    return { perspective, draftStore, timing: hypTiming };
  });

  const hypothesisResults = await Promise.all(hypothesizePromises);
  const timings: StepTiming[] = hypothesisResults.map((h) => h.timing);

  return { results: hypothesisResults, timings };
}
