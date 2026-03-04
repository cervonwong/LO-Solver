import { createStep } from '@mastra/core/workflows';
import { RequestContext } from '@mastra/core/request-context';
import type { WorkflowRequestContext } from '../request-context-types';
import type { ModelMode } from '../../openrouter';
import { activeModelId } from '../../openrouter';
import {
  recordStepTiming,
  logWorkflowSummary,
  logAgentOutput,
  logValidationError,
  formatTimestamp,
} from '../logging-utils';
import { streamWithRetry } from '../agent-utils';
import { emitTraceEvent, extractCostFromResult, updateCumulativeCost } from '../request-context-helpers';
import type { StepId } from '@/lib/workflow-events';
import { generateEventId } from '@/lib/workflow-events';
import {
  workflowStateSchema,
  questionsAnsweredSchema,
  questionAnsweringInputSchema,
} from '../workflow-schemas';

// Step 3: Answer questions using the validated rules and vocabulary from state
export const answerQuestionsStep = createStep({
  id: 'answer-questions',
  description:
    "Step 3: Answer the user's questions using the validated rules and vocabulary from workflow state.",
  inputSchema: questionAnsweringInputSchema,
  outputSchema: questionsAnsweredSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, mastra, bail, state, setState, writer, abortSignal }) => {
    const { structuredProblem, rules } = inputData;
    const logFile = state.logFile;

    const stepId: StepId = 'answer-questions';
    await emitTraceEvent(writer, {
      type: 'data-step-start',
      data: { stepId, timestamp: new Date().toISOString() },
    });

    // Rebuild vocabulary from workflow state (read-only for question answerer)
    const vocabularyState = new Map(Object.entries(state.vocabulary));
    const answererVocabulary = Array.from(vocabularyState.values());

    const answererPrompt = JSON.stringify({
      vocabulary: answererVocabulary,
      context: structuredProblem.context,
      dataset: structuredProblem.dataset,
      questions: structuredProblem.questions,
      rules: rules,
    });

    const requestContext = new RequestContext<WorkflowRequestContext>();
    requestContext.set('model-mode', state.modelMode as ModelMode);
    requestContext.set('workflow-start-time', state.workflowStartTime);
    requestContext.set('cumulative-cost', 0);

    const answererAgentId = generateEventId();
    await emitTraceEvent(writer, {
      type: 'data-agent-start',
      data: {
        id: answererAgentId,
        stepId,
        agentName: 'Question Answerer',
        model: activeModelId(state.modelMode as ModelMode, 'google/gemini-3-flash-preview'),
        task: answererPrompt.slice(0, 500),
        timestamp: new Date().toISOString(),
      },
    });

    const answererStartTime = new Date();
    const answererResponse = await streamWithRetry(
      mastra.getAgentById('question-answerer'),
      {
        prompt: answererPrompt,
        abortSignal,
        options: {
          maxSteps: 100,
          requestContext,
          structuredOutput: {
            schema: questionsAnsweredSchema,
          },
        },
        onTextChunk: (chunk) => {
          emitTraceEvent(writer, {
            type: 'data-agent-text-chunk',
            data: {
              parentId: answererAgentId,
              text: chunk,
              timestamp: new Date().toISOString(),
            },
          });
        },
      },
    );
    const answererDurationMs = new Date().getTime() - answererStartTime.getTime();

    // Track API cost
    const callCost = extractCostFromResult(answererResponse);
    await updateCumulativeCost(requestContext, writer, callCost);

    await emitTraceEvent(writer, {
      type: 'data-agent-end',
      data: {
        id: answererAgentId,
        stepId,
        agentName: 'Question Answerer',
        reasoning: answererResponse.text || '',
        durationMs: answererDurationMs,
        attempt: 1,
        totalAttempts: 1,
        ...(answererResponse.object
          ? { structuredOutput: answererResponse.object as Record<string, unknown> }
          : {}),
        timestamp: new Date().toISOString(),
      },
    });

    const answererTiming = recordStepTiming('Step 3', 'Question Answerer Agent', answererStartTime);
    const finalStepTimings = [...state.stepTimings, answererTiming];
    console.log(
      `${formatTimestamp(state.workflowStartTime)} [Step 3] Question Answerer Agent finished at ${answererTiming.endTime} (${answererTiming.durationMinutes} min).`,
    );

    const answererParseResult = questionsAnsweredSchema.safeParse(answererResponse.object);

    logAgentOutput(
      logFile,
      'Step 3: Answer Questions',
      'Question Answerer Agent',
      answererResponse.object,
      answererResponse.reasoningText,
      state.workflowStartTime,
    );

    if (!answererParseResult.success) {
      logValidationError(
        logFile,
        'Step 3: Answer Questions',
        answererParseResult.error,
        state.workflowStartTime,
      );
      return bail({
        success: false,
        message: '[Answer Questions Step] Validation failed: ' + answererParseResult.error.message,
      });
    }

    const answererParsed = answererParseResult.data;

    if (answererParsed.success === false) {
      return bail({
        success: false,
        message:
          '[Answer Questions Step] Failed to answer questions: ' + answererParsed.explanation,
      });
    }

    // Log the workflow timing summary at the end
    logWorkflowSummary(logFile, state.startTime, finalStepTimings);

    // Save final state
    await setState({ ...state, stepTimings: finalStepTimings });

    await emitTraceEvent(writer, {
      type: 'data-step-complete',
      data: {
        stepId,
        durationMs: Math.round(answererTiming.durationMinutes * 60_000),
        timestamp: new Date().toISOString(),
      },
    });

    return answererParsed;
  },
});
