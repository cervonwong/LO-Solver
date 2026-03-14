import type { HypothesizeContext, StepParams, VerifyResult, HypothesizeResult } from './02-shared';
import { attachMcpProvider } from './02-shared';
import type { StepTiming } from '../logging-utils';
import type { WorkflowRequestContext } from '../request-context-types';
import { RequestContext } from '@mastra/core/request-context';
import { streamWithRetry } from '../agent-utils';
import {
  emitTraceEvent,
  extractCostFromResult,
  extractTokensFromResult,
  updateCumulativeCost,
} from '../request-context-helpers';
import { recordStepTiming, logAgentOutput, formatTimestamp } from '../logging-utils';
import { activeModelId } from '../../openrouter';
import { generateEventId } from '@/lib/workflow-events';
import { verifierFeedbackSchema } from '../workflow-schemas';

/**
 * Verify sub-phase: score each perspective's draft store via a two-agent chain
 * (verifier orchestrator -> feedback extractor). Runs all perspectives in parallel.
 */
export async function runVerify(
  ctx: HypothesizeContext,
  params: StepParams,
  round: number,
  hypothesisResults: HypothesizeResult['results'],
): Promise<VerifyResult> {
  const allTimings: StepTiming[] = [];

  const verifyPromises = hypothesisResults.map(async ({ perspective, draftStore }) => {
    // Create a RequestContext with draft rules as current-rules for verifier
    const verifyRequestContext = new RequestContext<WorkflowRequestContext>();
    verifyRequestContext.set('vocabulary-state', draftStore.vocabulary);
    verifyRequestContext.set('structured-problem', ctx.structuredProblem);
    verifyRequestContext.set('current-rules', Array.from(draftStore.rules.values()));
    verifyRequestContext.set('log-file', ctx.logFile);
    verifyRequestContext.set('provider-mode', ctx.providerMode);
    verifyRequestContext.set('step-writer', params.writer);
    verifyRequestContext.set('step-id', ctx.stepId);
    verifyRequestContext.set('event-source', 'draft');
    verifyRequestContext.set('workflow-start-time', ctx.workflowStartTime);
    verifyRequestContext.set('abort-signal', params.abortSignal);
    const verifyProvider = ctx.mainRequestContext.get('openrouter-provider');
    if (verifyProvider) verifyRequestContext.set('openrouter-provider', verifyProvider);

    // Attach MCP tools for Claude Code mode (committed-mode testers for verifier)
    attachMcpProvider(verifyRequestContext, params.mastra, ctx.providerMode, 'committed');

    const verifyVocabulary = Array.from(draftStore.vocabulary.values());
    const verifyRules = Array.from(draftStore.rules.values());

    const verifierPrompt = JSON.stringify({
      vocabulary: verifyVocabulary,
      structuredProblem: ctx.structuredProblem,
      rules: verifyRules,
    });

    // Step 1: Call verifier orchestrator
    const verifierAgentId = generateEventId();
    await emitTraceEvent(params.writer, {
      type: 'data-agent-start',
      data: {
        id: verifierAgentId,
        perspectiveId: perspective.id,
        stepId: ctx.stepId,
        agentName: `Verifier (${perspective.name})`,
        model: activeModelId(ctx.providerMode, 'google/gemini-3-flash-preview'),
        task: verifierPrompt.slice(0, 500),
        timestamp: new Date().toISOString(),
      },
    });

    verifyRequestContext.set('parent-agent-id', verifierAgentId);
    const verifierStartTime = new Date();
    const verifierResponse = await streamWithRetry(
      params.mastra.getAgentById('verifier-orchestrator'),
      {
        prompt: verifierPrompt,
        ...(params.abortSignal && { abortSignal: params.abortSignal }),
        options: { maxSteps: 100, requestContext: verifyRequestContext },
        responseCheck: 'toolActivity',
        onTextChunk: (chunk) => {
          emitTraceEvent(params.writer, {
            type: 'data-agent-text-chunk',
            data: {
              parentId: verifierAgentId,
              text: chunk,
              timestamp: new Date().toISOString(),
            },
          });
        },
      },
    );
    const verifierDurationMs = new Date().getTime() - verifierStartTime.getTime();
    verifyRequestContext.set('parent-agent-id', undefined);

    // Track API cost
    const verifyCost = extractCostFromResult(verifierResponse);
    const verifyTokens = extractTokensFromResult(verifierResponse);
    await updateCumulativeCost(ctx.mainRequestContext, params.writer, verifyCost, verifyTokens);

    await emitTraceEvent(params.writer, {
      type: 'data-agent-end',
      data: {
        id: verifierAgentId,
        perspectiveId: perspective.id,
        stepId: ctx.stepId,
        agentName: `Verifier (${perspective.name})`,
        reasoning: verifierResponse.text || '',
        durationMs: verifierDurationMs,
        attempt: 1,
        totalAttempts: 1,
        timestamp: new Date().toISOString(),
      },
    });

    const verifierTiming = recordStepTiming(
      `Round ${round} Verify (${perspective.id})`,
      'Verifier Orchestrator Agent',
      verifierStartTime,
    );
    allTimings.push(verifierTiming);
    console.log(
      `${formatTimestamp(ctx.workflowStartTime)} [Round ${round}] Verifier (${perspective.id}) finished at ${verifierTiming.endTime} (${verifierTiming.durationMinutes} min).`,
    );

    // Step 2: Extract structured feedback
    const extractorPrompt =
      'Please extract the verification feedback from the following analysis:\\n\\n' +
      verifierResponse.text;

    const extractorAgentId = generateEventId();
    await emitTraceEvent(params.writer, {
      type: 'data-agent-start',
      data: {
        id: extractorAgentId,
        perspectiveId: perspective.id,
        stepId: ctx.stepId,
        agentName: `Feedback Extractor (${perspective.name})`,
        model: activeModelId(ctx.providerMode, 'openai/gpt-5-mini'),
        task: extractorPrompt.slice(0, 500),
        timestamp: new Date().toISOString(),
      },
    });

    verifyRequestContext.set('parent-agent-id', extractorAgentId);
    const extractorStartTime = new Date();
    const extractorResponse = await streamWithRetry(
      params.mastra.getAgentById('verifier-feedback-extractor'),
      {
        prompt: extractorPrompt,
        ...(params.abortSignal && { abortSignal: params.abortSignal }),
        options: {
          maxSteps: 100,
          requestContext: verifyRequestContext,
          structuredOutput: { schema: verifierFeedbackSchema },
        },
        onTextChunk: (chunk) => {
          emitTraceEvent(params.writer, {
            type: 'data-agent-text-chunk',
            data: {
              parentId: extractorAgentId,
              text: chunk,
              timestamp: new Date().toISOString(),
            },
          });
        },
      },
    );
    const extractorDurationMs = new Date().getTime() - extractorStartTime.getTime();
    verifyRequestContext.set('parent-agent-id', undefined);

    // Track API cost
    const extractorCost = extractCostFromResult(extractorResponse);
    const extractorTokens = extractTokensFromResult(extractorResponse);
    await updateCumulativeCost(ctx.mainRequestContext, params.writer, extractorCost, extractorTokens);

    await emitTraceEvent(params.writer, {
      type: 'data-agent-end',
      data: {
        id: extractorAgentId,
        perspectiveId: perspective.id,
        stepId: ctx.stepId,
        agentName: `Feedback Extractor (${perspective.name})`,
        reasoning: extractorResponse.text || '',
        durationMs: extractorDurationMs,
        attempt: 1,
        totalAttempts: 1,
        ...(extractorResponse.object
          ? { structuredOutput: extractorResponse.object as Record<string, unknown> }
          : {}),
        timestamp: new Date().toISOString(),
      },
    });

    const extractorTiming = recordStepTiming(
      `Round ${round} Verify Extract (${perspective.id})`,
      'Verifier Feedback Extractor Agent',
      extractorStartTime,
    );
    allTimings.push(extractorTiming);

    const feedbackParsed = verifierFeedbackSchema.safeParse(extractorResponse.object);

    logAgentOutput(
      ctx.logFile,
      `Round ${round}: Verify (${perspective.id})`,
      'Verifier Feedback Extractor Agent',
      extractorResponse.object,
      extractorResponse.reasoningText,
      ctx.workflowStartTime,
    );

    if (!feedbackParsed.success) {
      // If verification feedback fails to parse, assign a 0 score
      console.warn(
        `${formatTimestamp(ctx.workflowStartTime)} [Round ${round}] Verifier feedback parse failed for ${perspective.id}:`,
        feedbackParsed.error.message,
      );
      return {
        perspectiveId: perspective.id,
        perspectiveName: perspective.name,
        rulesCount: draftStore.rules.size,
        vocabularyCount: draftStore.vocabulary.size,
        testPassRate: 0,
        verifierConclusion: 'MAJOR_ISSUES' as const,
        errantRulesCount: draftStore.rules.size,
        errantSentencesCount: 0,
      };
    }

    const feedback = feedbackParsed.data;
    const totalChecks = feedback.rulesTestedCount + feedback.sentencesTestedCount;
    const failedChecks = feedback.errantRules.length + feedback.errantSentences.length;
    const testPassRate = totalChecks > 0 ? 1 - failedChecks / totalChecks : 0;

    return {
      perspectiveId: perspective.id,
      perspectiveName: perspective.name,
      rulesCount: draftStore.rules.size,
      vocabularyCount: draftStore.vocabulary.size,
      testPassRate,
      verifierConclusion: feedback.conclusion,
      errantRulesCount: feedback.errantRules.length,
      errantSentencesCount: feedback.errantSentences.length,
    };
  });

  const verifyResults = await Promise.all(verifyPromises);

  return { perspectiveResults: verifyResults, timings: allTimings };
}
