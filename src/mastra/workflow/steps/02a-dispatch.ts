import type { HypothesizeContext, StepParams, DispatchResult } from './02-hypothesize';
import type { StepTiming } from '../logging-utils';
import { streamWithRetry } from '../agent-utils';
import {
  emitTraceEvent,
  extractCostFromResult,
  updateCumulativeCost,
} from '../request-context-helpers';
import { recordStepTiming, logAgentOutput, formatTimestamp } from '../logging-utils';
import { activeModelId } from '../../openrouter';
import { generateEventId } from '@/lib/workflow-events';
import {
  dispatcherOutputSchema,
  improverDispatcherOutputSchema,
} from '../workflow-schemas';

/**
 * Dispatch sub-phase: determine which perspectives to explore.
 * Round 1 uses the dispatcher agent; round 2+ uses the improver-dispatcher
 * with current rules, vocabulary, and previous test results.
 */
export async function runDispatch(
  ctx: HypothesizeContext,
  params: StepParams,
  round: number,
  isImproverRound: boolean,
  lastTestResults: unknown,
  previousPerspectiveIds: string[],
): Promise<DispatchResult> {
  const timings: StepTiming[] = [];

  if (!isImproverRound) {
    // Round 1: Use dispatcher agent
    const dispatcherPrompt = JSON.stringify({
      structuredProblem: ctx.structuredProblem,
      perspectiveCount: ctx.effectivePerspectiveCount,
    });

    const dispatchAgentId = generateEventId();
    await emitTraceEvent(params.writer, {
      type: 'data-agent-start',
      data: {
        id: dispatchAgentId,
        stepId: ctx.stepId,
        agentName: `Perspective Dispatcher (Round ${round})`,
        model: activeModelId(ctx.modelMode, 'google/gemini-3-flash-preview'),
        task: dispatcherPrompt.slice(0, 500),
        timestamp: new Date().toISOString(),
      },
    });

    ctx.mainRequestContext.set('parent-agent-id', dispatchAgentId);
    const dispatchStartTime = new Date();
    const dispatcherResponse = await streamWithRetry(
      params.mastra.getAgentById('perspective-dispatcher'),
      {
        prompt: dispatcherPrompt,
        ...(params.abortSignal && { abortSignal: params.abortSignal }),
        options: {
          maxSteps: 100,
          requestContext: ctx.mainRequestContext,
          structuredOutput: { schema: dispatcherOutputSchema },
        },
        onTextChunk: (chunk) => {
          emitTraceEvent(params.writer, {
            type: 'data-agent-text-chunk',
            data: {
              parentId: dispatchAgentId,
              text: chunk,
              timestamp: new Date().toISOString(),
            },
          });
        },
      },
    );
    const dispatchDurationMs = new Date().getTime() - dispatchStartTime.getTime();
    ctx.mainRequestContext.set('parent-agent-id', undefined);

    // Track API cost
    const dispatchCost = extractCostFromResult(dispatcherResponse);
    await updateCumulativeCost(ctx.mainRequestContext, params.writer, dispatchCost);

    await emitTraceEvent(params.writer, {
      type: 'data-agent-end',
      data: {
        id: dispatchAgentId,
        stepId: ctx.stepId,
        agentName: `Perspective Dispatcher (Round ${round})`,
        reasoning: dispatcherResponse.text || '',
        durationMs: dispatchDurationMs,
        attempt: 1,
        totalAttempts: 1,
        ...(dispatcherResponse.object
          ? { structuredOutput: dispatcherResponse.object as Record<string, unknown> }
          : {}),
        timestamp: new Date().toISOString(),
      },
    });

    const dispatchTiming = recordStepTiming(
      `Round ${round} Dispatch`,
      'Perspective Dispatcher Agent',
      dispatchStartTime,
    );
    timings.push(dispatchTiming);
    console.log(
      `${formatTimestamp(ctx.workflowStartTime)} [Round ${round}] Dispatcher finished at ${dispatchTiming.endTime} (${dispatchTiming.durationMinutes} min).`,
    );

    logAgentOutput(
      ctx.logFile,
      `Round ${round}: Dispatch`,
      'Perspective Dispatcher Agent',
      dispatcherResponse.object,
      dispatcherResponse.reasoningText,
      ctx.workflowStartTime,
    );

    const dispatchParsed = dispatcherOutputSchema.safeParse(dispatcherResponse.object);
    if (!dispatchParsed.success || !dispatchParsed.data.perspectives) {
      return {
        perspectives: null,
        error:
          '[Multi-Perspective] Dispatcher failed: ' +
          (dispatchParsed.error?.message ?? 'No perspectives generated'),
        timings,
      };
    }

    return { perspectives: dispatchParsed.data.perspectives, timings };
  }

  // Round 2+: Use improver-dispatcher with current state + test results
  const mainRulesArray = Array.from(ctx.mainRules.values());
  const mainVocabArray = Array.from(ctx.mainVocabulary.values());

  const improverPrompt = JSON.stringify({
    structuredProblem: ctx.structuredProblem,
    perspectiveCount: ctx.effectivePerspectiveCount,
    currentRules: mainRulesArray,
    currentVocabulary: mainVocabArray,
    testResults: lastTestResults,
    previousPerspectiveIds,
  });

  const improverDispatchAgentId = generateEventId();
  await emitTraceEvent(params.writer, {
    type: 'data-agent-start',
    data: {
      id: improverDispatchAgentId,
      stepId: ctx.stepId,
      agentName: `Improver Dispatcher (Round ${round})`,
      model: activeModelId(ctx.modelMode, 'google/gemini-3-flash-preview'),
      task: improverPrompt.slice(0, 500),
      timestamp: new Date().toISOString(),
    },
  });

  ctx.mainRequestContext.set('parent-agent-id', improverDispatchAgentId);
  const improverDispatchStartTime = new Date();
  const improverDispatcherResponse = await streamWithRetry(
    params.mastra.getAgentById('improver-dispatcher'),
    {
      prompt: improverPrompt,
      ...(params.abortSignal && { abortSignal: params.abortSignal }),
      options: {
        maxSteps: 100,
        requestContext: ctx.mainRequestContext,
        structuredOutput: { schema: improverDispatcherOutputSchema },
      },
      onTextChunk: (chunk) => {
        emitTraceEvent(params.writer, {
          type: 'data-agent-text-chunk',
          data: {
            parentId: improverDispatchAgentId,
            text: chunk,
            timestamp: new Date().toISOString(),
          },
        });
      },
    },
  );
  const improverDispatchDurationMs =
    new Date().getTime() - improverDispatchStartTime.getTime();
  ctx.mainRequestContext.set('parent-agent-id', undefined);

  // Track API cost
  const improverDispatchCost = extractCostFromResult(improverDispatcherResponse);
  await updateCumulativeCost(ctx.mainRequestContext, params.writer, improverDispatchCost);

  await emitTraceEvent(params.writer, {
    type: 'data-agent-end',
    data: {
      id: improverDispatchAgentId,
      stepId: ctx.stepId,
      agentName: `Improver Dispatcher (Round ${round})`,
      reasoning: improverDispatcherResponse.text || '',
      durationMs: improverDispatchDurationMs,
      attempt: 1,
      totalAttempts: 1,
      ...(improverDispatcherResponse.object
        ? {
            structuredOutput:
              improverDispatcherResponse.object as Record<string, unknown>,
          }
        : {}),
      timestamp: new Date().toISOString(),
    },
  });

  const improverDispatchTiming = recordStepTiming(
    `Round ${round} Improver Dispatch`,
    'Improver Dispatcher Agent',
    improverDispatchStartTime,
  );
  timings.push(improverDispatchTiming);
  console.log(
    `${formatTimestamp(ctx.workflowStartTime)} [Round ${round}] Improver Dispatcher finished at ${improverDispatchTiming.endTime} (${improverDispatchTiming.durationMinutes} min).`,
  );

  logAgentOutput(
    ctx.logFile,
    `Round ${round}: Improver Dispatch`,
    'Improver Dispatcher Agent',
    improverDispatcherResponse.object,
    improverDispatcherResponse.reasoningText,
    ctx.workflowStartTime,
  );

  const improverParsed = improverDispatcherOutputSchema.safeParse(
    improverDispatcherResponse.object,
  );
  if (!improverParsed.success || !improverParsed.data.perspectives) {
    // If improver-dispatcher returns no perspectives, signal stop
    console.log(
      `${formatTimestamp(ctx.workflowStartTime)} [Round ${round}] Improver returned no new perspectives, stopping.`,
    );
    return { perspectives: null, timings };
  }

  return { perspectives: improverParsed.data.perspectives, timings };
}
