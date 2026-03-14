import { createStep } from '@mastra/core/workflows';
import { RequestContext } from '@mastra/core/request-context';
import type { ProviderMode } from '../../openrouter';
import { activeModelId, createOpenRouterProvider } from '../../openrouter';
import {
  recordStepTiming,
  logAgentOutput,
  logValidationError,
  formatTimestamp,
} from '../logging-utils';
import { streamWithRetry } from '../agent-utils';
import { emitTraceEvent, extractCostFromResult, extractTokensFromResult, updateCumulativeCost } from '../request-context-helpers';
import type { WorkflowRequestContext } from '../request-context-types';
import type { StepId } from '@/lib/workflow-events';
import { generateEventId } from '@/lib/workflow-events';
import {
  workflowStateSchema,
  initializeWorkflowState,
  rawProblemInputSchema,
  structuredProblemSchema,
} from '../workflow-schemas';

export const extractionStep = createStep({
  id: 'extract-structure',
  description: 'Step 1: Extract structured problem data from raw text input.',
  inputSchema: rawProblemInputSchema,
  outputSchema: structuredProblemSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, mastra, bail, state, setState, writer, abortSignal }) => {
    // Initialize workflow state at the start of the workflow
    const initialState = initializeWorkflowState();
    const providerMode = inputData.providerMode ?? 'openrouter-testing';
    const maxRounds = inputData.maxRounds ?? 3;
    const perspectiveCount = inputData.perspectiveCount ?? 3;
    const stateWithMode = { ...initialState, providerMode, maxRounds, perspectiveCount, apiKey: inputData.apiKey };
    await setState(stateWithMode);
    const logFile = initialState.logFile;

    const stepId: StepId = 'extract-structure';
    await emitTraceEvent(writer, {
      type: 'data-step-start',
      data: { stepId, timestamp: new Date().toISOString() },
    });

    const requestContext = new RequestContext<WorkflowRequestContext>();
    requestContext.set('provider-mode', providerMode as ProviderMode);
    requestContext.set('workflow-start-time', initialState.workflowStartTime);
    requestContext.set('cumulative-cost', 0);
    if (inputData.apiKey) {
      requestContext.set('openrouter-provider', createOpenRouterProvider(inputData.apiKey));
    }

    const extractAgentId = generateEventId();
    const extractPrompt = `${inputData.rawProblemText}`;
    await emitTraceEvent(writer, {
      type: 'data-agent-start',
      data: {
        id: extractAgentId,
        stepId,
        agentName: 'Structured Problem Extractor',
        model: activeModelId(providerMode, 'openai/gpt-5-mini'),
        task: extractPrompt.slice(0, 500),
        timestamp: new Date().toISOString(),
      },
    });

    const step1StartTime = new Date();
    const response = await streamWithRetry(
      mastra.getAgentById('structured-problem-extractor'),
      {
        prompt: extractPrompt,
        abortSignal,
        options: {
          maxSteps: 100,
          requestContext,
          structuredOutput: {
            schema: structuredProblemSchema,
          },
        },
        onTextChunk: (chunk) => {
          emitTraceEvent(writer, {
            type: 'data-agent-text-chunk',
            data: { parentId: extractAgentId, text: chunk, timestamp: new Date().toISOString() },
          });
        },
      },
    );
    const step1DurationMs = new Date().getTime() - step1StartTime.getTime();

    // Track API cost
    const callCost = extractCostFromResult(response);
    const callTokens = extractTokensFromResult(response);
    await updateCumulativeCost(requestContext, writer, callCost, callTokens);

    await emitTraceEvent(writer, {
      type: 'data-agent-end',
      data: {
        id: extractAgentId,
        stepId,
        agentName: 'Structured Problem Extractor',
        reasoning: response.text || '',
        durationMs: step1DurationMs,
        attempt: 1,
        totalAttempts: 1,
        ...(response.object
          ? { structuredOutput: response.object as Record<string, unknown> }
          : {}),
        timestamp: new Date().toISOString(),
      },
    });

    const timing1 = recordStepTiming(
      'Step 1',
      'Structured Problem Extractor Agent',
      step1StartTime,
    );
    await setState({ ...stateWithMode, stepTimings: [...stateWithMode.stepTimings, timing1] });
    console.log(
      `${formatTimestamp(initialState.workflowStartTime)} [Step 1] Structured Problem Extractor Agent finished at ${timing1.endTime} (${timing1.durationMinutes} min).`,
    );

    // validate the agent response against the expected schema so the step returns the correct type
    const parseResult = structuredProblemSchema.safeParse(response.object);

    logAgentOutput(
      logFile,
      'Step 1: Extract Structure',
      'Structured Problem Extractor Agent',
      response.object,
      response.reasoningText,
      initialState.workflowStartTime,
    );

    if (!parseResult.success) {
      logValidationError(
        logFile,
        'Step 1: Extract Structure',
        parseResult.error,
        initialState.workflowStartTime,
      );
      return bail({
        success: false,
        message: '[Extract Structure Step] Validation failed: ' + parseResult.error.message,
      });
    }

    const parsed = parseResult.data;

    if (parsed.success === false) {
      return bail({
        success: false,
        message: '[Extract Structure Step] Extraction failed: ' + parsed.explanation,
      });
    }

    await emitTraceEvent(writer, {
      type: 'data-step-complete',
      data: {
        stepId,
        durationMs: Math.round(timing1.durationMinutes * 60_000),
        timestamp: new Date().toISOString(),
      },
    });

    return parsed;
  },
});
