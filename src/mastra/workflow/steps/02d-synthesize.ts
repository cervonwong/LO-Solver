import type { HypothesizeContext, StepParams, SynthesizeResult } from './02-hypothesize';
import type { StepTiming } from '../logging-utils';
import type { Perspective, PerspectiveResult } from '../workflow-schemas';
import type { WorkflowRequestContext } from '../request-context-types';
import { RequestContext } from '@mastra/core/request-context';
import { streamWithRetry } from '../agent-utils';
import {
  emitTraceEvent,
  extractCostFromResult,
  updateCumulativeCost,
} from '../request-context-helpers';
import { recordStepTiming, logAgentOutput, formatTimestamp } from '../logging-utils';
import { activeModelId } from '../../openrouter';
import { generateEventId } from '@/lib/workflow-events';
import { verifierFeedbackSchema } from '../workflow-schemas';

/**
 * Synthesize + convergence sub-phase: merge perspective rulesets via a synthesizer
 * agent, then verify the merged result via the convergence verifier chain.
 * Operates on ctx.mainVocabulary and ctx.mainRules by reference (STR-03).
 */
export async function runSynthesize(
  ctx: HypothesizeContext,
  params: StepParams,
  round: number,
  perspectives: Perspective[],
  perspectiveResults: PerspectiveResult[],
): Promise<SynthesizeResult> {
  const timings: StepTiming[] = [];
  ctx.mainRequestContext.set('event-source', 'merged');

  await emitTraceEvent(params.writer, {
    type: 'data-synthesis-start',
    data: { round, perspectiveCount: perspectives.length, timestamp: new Date().toISOString() },
  });

  const sortedResults = [...perspectiveResults].sort(
    (a, b) => b.testPassRate - a.testPassRate,
  );

  // Vocabulary merge: clear then merge from worst to best so best wins
  ctx.mainVocabulary.clear();
  for (const result of [...sortedResults].reverse()) {
    const draft = ctx.draftStores.get(result.perspectiveId);
    if (draft) {
      for (const [key, entry] of draft.vocabulary) {
        ctx.mainVocabulary.set(key, entry);
      }
    }
  }

  ctx.mainRules.clear();

  const perspectiveRulesData = sortedResults.map((result) => {
    const draft = ctx.draftStores.get(result.perspectiveId);
    return {
      perspectiveId: result.perspectiveId,
      perspectiveName: result.perspectiveName,
      testPassRate: result.testPassRate,
      verifierConclusion: result.verifierConclusion,
      rules: draft ? Array.from(draft.rules.values()) : [],
      vocabularyCount: result.vocabularyCount,
    };
  });

  const synthesizerPrompt = JSON.stringify({
    structuredProblem: ctx.structuredProblem,
    perspectiveResults: sortedResults,
    perspectiveRules: perspectiveRulesData,
    mergedVocabulary: Array.from(ctx.mainVocabulary.values()),
  });

  const synthesizerAgentId = generateEventId();
  await emitTraceEvent(params.writer, {
    type: 'data-agent-start',
    data: {
      id: synthesizerAgentId,
      stepId: ctx.stepId,
      agentName: `Hypothesis Synthesizer (Round ${round})`,
      model: activeModelId(ctx.modelMode, 'google/gemini-3-flash-preview'),
      task: synthesizerPrompt.slice(0, 500),
      timestamp: new Date().toISOString(),
    },
  });

  ctx.mainRequestContext.set('parent-agent-id', synthesizerAgentId);
  const synthesizerStartTime = new Date();
  const synthesizerResponse = await streamWithRetry(
    params.mastra.getAgentById('hypothesis-synthesizer'),
    {
      prompt: synthesizerPrompt,
      ...(params.abortSignal && { abortSignal: params.abortSignal }),
      options: { maxSteps: 100, requestContext: ctx.mainRequestContext },
      responseCheck: 'toolActivity',
      onTextChunk: (chunk) => {
        emitTraceEvent(params.writer, {
          type: 'data-agent-text-chunk',
          data: { parentId: synthesizerAgentId, text: chunk, timestamp: new Date().toISOString() },
        });
      },
    },
  );
  const synthesizerDurationMs = new Date().getTime() - synthesizerStartTime.getTime();
  ctx.mainRequestContext.set('parent-agent-id', undefined);

  const synthesizerCost = extractCostFromResult(synthesizerResponse);
  await updateCumulativeCost(ctx.mainRequestContext, params.writer, synthesizerCost);

  await emitTraceEvent(params.writer, {
    type: 'data-agent-end',
    data: {
      id: synthesizerAgentId,
      stepId: ctx.stepId,
      agentName: `Hypothesis Synthesizer (Round ${round})`,
      reasoning: synthesizerResponse.text || '',
      durationMs: synthesizerDurationMs,
      attempt: 1,
      totalAttempts: 1,
      timestamp: new Date().toISOString(),
    },
  });

  const synthesizerTiming = recordStepTiming(
    `Round ${round} Synthesis`,
    'Hypothesis Synthesizer Agent',
    synthesizerStartTime,
  );
  timings.push(synthesizerTiming);
  console.log(
    `${formatTimestamp(ctx.workflowStartTime)} [Round ${round}] Synthesizer finished at ${synthesizerTiming.endTime} (${synthesizerTiming.durationMinutes} min).`,
  );

  logAgentOutput(
    ctx.logFile,
    `Round ${round}: Synthesis`,
    'Hypothesis Synthesizer Agent',
    { naturalLanguageOutput: synthesizerResponse.text },
    synthesizerResponse.reasoningText,
    ctx.workflowStartTime,
  );

  await emitTraceEvent(params.writer, {
    type: 'data-synthesis-complete',
    data: {
      round,
      mergedRulesCount: ctx.mainRules.size,
      mergedVocabCount: ctx.mainVocabulary.size,
      testPassRate: 0,
      timestamp: new Date().toISOString(),
    },
  });

  // Convergence check: verify synthesized rules
  await emitTraceEvent(params.writer, {
    type: 'data-convergence-start',
    data: { round, timestamp: new Date().toISOString() },
  });

  const convergenceRequestContext = new RequestContext<WorkflowRequestContext>();
  convergenceRequestContext.set('vocabulary-state', ctx.mainVocabulary);
  convergenceRequestContext.set('structured-problem', ctx.structuredProblem);
  convergenceRequestContext.set('current-rules', Array.from(ctx.mainRules.values()));
  convergenceRequestContext.set('log-file', ctx.logFile);
  convergenceRequestContext.set('model-mode', ctx.modelMode);
  convergenceRequestContext.set('step-writer', params.writer);
  convergenceRequestContext.set('step-id', ctx.stepId);
  convergenceRequestContext.set('event-source', 'merged');
  convergenceRequestContext.set('workflow-start-time', ctx.workflowStartTime);
  convergenceRequestContext.set('abort-signal', params.abortSignal);
  const convProvider = ctx.mainRequestContext.get('openrouter-provider');
  if (convProvider) convergenceRequestContext.set('openrouter-provider', convProvider);

  const convergenceVerifierPrompt = JSON.stringify({
    vocabulary: Array.from(ctx.mainVocabulary.values()),
    structuredProblem: ctx.structuredProblem,
    rules: Array.from(ctx.mainRules.values()),
  });

  const convergenceAgentId = generateEventId();
  await emitTraceEvent(params.writer, {
    type: 'data-agent-start',
    data: {
      id: convergenceAgentId,
      stepId: ctx.stepId,
      agentName: `Convergence Verifier (Round ${round})`,
      model: activeModelId(ctx.modelMode, 'google/gemini-3-flash-preview'),
      task: convergenceVerifierPrompt.slice(0, 500),
      timestamp: new Date().toISOString(),
    },
  });

  convergenceRequestContext.set('parent-agent-id', convergenceAgentId);
  const convergenceStartTime = new Date();
  const convergenceVerifierResponse = await streamWithRetry(
    params.mastra.getAgentById('verifier-orchestrator'),
    {
      prompt: convergenceVerifierPrompt,
      ...(params.abortSignal && { abortSignal: params.abortSignal }),
      options: { maxSteps: 100, requestContext: convergenceRequestContext },
      responseCheck: 'toolActivity',
      onTextChunk: (chunk) => {
        emitTraceEvent(params.writer, {
          type: 'data-agent-text-chunk',
          data: { parentId: convergenceAgentId, text: chunk, timestamp: new Date().toISOString() },
        });
      },
    },
  );
  const convergenceDurationMs = new Date().getTime() - convergenceStartTime.getTime();
  convergenceRequestContext.set('parent-agent-id', undefined);

  const convergenceCost = extractCostFromResult(convergenceVerifierResponse);
  await updateCumulativeCost(ctx.mainRequestContext, params.writer, convergenceCost);

  await emitTraceEvent(params.writer, {
    type: 'data-agent-end',
    data: {
      id: convergenceAgentId,
      stepId: ctx.stepId,
      agentName: `Convergence Verifier (Round ${round})`,
      reasoning: convergenceVerifierResponse.text || '',
      durationMs: convergenceDurationMs,
      attempt: 1,
      totalAttempts: 1,
      timestamp: new Date().toISOString(),
    },
  });

  timings.push(recordStepTiming(
    `Round ${round} Convergence Check`,
    'Verifier Orchestrator Agent',
    convergenceStartTime,
  ));

  const convergenceExtractorPrompt =
    'Please extract the verification feedback from the following analysis:\\n\\n' +
    convergenceVerifierResponse.text;

  const convergenceExtractorAgentId = generateEventId();
  await emitTraceEvent(params.writer, {
    type: 'data-agent-start',
    data: {
      id: convergenceExtractorAgentId,
      stepId: ctx.stepId,
      agentName: `Convergence Extractor (Round ${round})`,
      model: activeModelId(ctx.modelMode, 'openai/gpt-5-mini'),
      task: convergenceExtractorPrompt.slice(0, 500),
      timestamp: new Date().toISOString(),
    },
  });

  convergenceRequestContext.set('parent-agent-id', convergenceExtractorAgentId);
  const convergenceExtractorStartTime = new Date();
  const convergenceExtractorResponse = await streamWithRetry(
    params.mastra.getAgentById('verifier-feedback-extractor'),
    {
      prompt: convergenceExtractorPrompt,
      ...(params.abortSignal && { abortSignal: params.abortSignal }),
      options: {
        maxSteps: 100,
        requestContext: convergenceRequestContext,
        structuredOutput: { schema: verifierFeedbackSchema },
      },
      onTextChunk: (chunk) => {
        emitTraceEvent(params.writer, {
          type: 'data-agent-text-chunk',
          data: {
            parentId: convergenceExtractorAgentId,
            text: chunk,
            timestamp: new Date().toISOString(),
          },
        });
      },
    },
  );
  const convergenceExtractorDurationMs =
    new Date().getTime() - convergenceExtractorStartTime.getTime();
  convergenceRequestContext.set('parent-agent-id', undefined);

  const convergenceExtractorCost = extractCostFromResult(convergenceExtractorResponse);
  await updateCumulativeCost(ctx.mainRequestContext, params.writer, convergenceExtractorCost);

  await emitTraceEvent(params.writer, {
    type: 'data-agent-end',
    data: {
      id: convergenceExtractorAgentId,
      stepId: ctx.stepId,
      agentName: `Convergence Extractor (Round ${round})`,
      reasoning: convergenceExtractorResponse.text || '',
      durationMs: convergenceExtractorDurationMs,
      attempt: 1,
      totalAttempts: 1,
      ...(convergenceExtractorResponse.object
        ? { structuredOutput: convergenceExtractorResponse.object as Record<string, unknown> }
        : {}),
      timestamp: new Date().toISOString(),
    },
  });

  timings.push(recordStepTiming(
    `Round ${round} Convergence Extract`,
    'Verifier Feedback Extractor Agent',
    convergenceExtractorStartTime,
  ));

  const convergenceParsed = verifierFeedbackSchema.safeParse(
    convergenceExtractorResponse.object,
  );

  logAgentOutput(
    ctx.logFile,
    `Round ${round}: Convergence Check`,
    'Verifier Feedback Extractor Agent',
    convergenceExtractorResponse.object,
    convergenceExtractorResponse.reasoningText,
    ctx.workflowStartTime,
  );

  const convergencePassRate = convergenceParsed.success
    ? (() => {
        const fb = convergenceParsed.data;
        const total = fb.rulesTestedCount + fb.sentencesTestedCount;
        const failed = fb.errantRules.length + fb.errantSentences.length;
        return total > 0 ? 1 - failed / total : 0;
      })()
    : 0;

  const convergenceConclusion = convergenceParsed.success
    ? convergenceParsed.data.conclusion
    : ('MAJOR_ISSUES' as const);

  const converged =
    convergenceParsed.success && convergenceParsed.data.conclusion === 'ALL_RULES_PASS';

  await emitTraceEvent(params.writer, {
    type: 'data-convergence-complete',
    data: { round, converged, testPassRate: convergencePassRate, timestamp: new Date().toISOString() },
  });

  return {
    convergencePassRate,
    convergenceConclusion,
    converged,
    convergenceFeedback: convergenceParsed.success ? convergenceParsed.data : null,
    timings,
  };
}
