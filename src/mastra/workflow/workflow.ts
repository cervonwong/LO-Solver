import { createStep, createWorkflow } from '@mastra/core/workflows';
import { RequestContext } from '@mastra/core/request-context';
import { type VocabularyEntry } from './vocabulary-tools';
import type { WorkflowRequestContext } from './request-context-types';
import type { ModelMode } from '../openrouter';
import { activeModelId } from '../openrouter';
import {
  type StepTiming,
  recordStepTiming,
  logWorkflowSummary,
  logAgentOutput,
  logValidationError,
} from './logging-utils';
import { generateWithRetry } from './agent-utils';
import { emitTraceEvent } from './request-context-helpers';
import type { StepId } from '@/lib/workflow-events';
import {
  MAX_VERIFY_IMPROVE_ITERATIONS,
  workflowStateSchema,
  type WorkflowState,
  initializeWorkflowState,
  rawProblemInputSchema,
  structuredProblemSchema,
  structuredProblemDataSchema,
  rulesSchema,
  verifierFeedbackSchema,
  questionsAnsweredSchema,
  hypothesisTestLoopSchema,
  initialHypothesisInputSchema,
  initialHypothesisOutputSchema,
  questionAnsweringInputSchema,
} from './workflow-schemas';

const extractionStep = createStep({
  id: 'extract-structure',
  description: 'Step 1: Extract structured problem data from raw text input.',
  inputSchema: rawProblemInputSchema,
  outputSchema: structuredProblemSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, mastra, bail, state, setState, writer }) => {
    // Initialize workflow state at the start of the workflow
    const initialState = initializeWorkflowState();
    const modelMode = inputData.modelMode ?? 'testing';
    const stateWithMode = { ...initialState, modelMode };
    await setState(stateWithMode);
    const logFile = initialState.logFile;

    const stepId: StepId = 'extract-structure';
    await emitTraceEvent(writer, {
      type: 'data-step-start',
      data: { stepId, timestamp: new Date().toISOString() },
    });

    const step1StartTime = new Date();
    const requestContext = new RequestContext<WorkflowRequestContext>();
    requestContext.set('model-mode', modelMode as ModelMode);
    const response = await generateWithRetry(
      mastra.getAgentById('structured-problem-extractor'),
      {
        prompt: `${inputData.rawProblemText}`,
        options: {
          maxSteps: 100,
          requestContext,
          structuredOutput: {
            schema: structuredProblemSchema,
          },
        },
      },
    );

    const timing1 = recordStepTiming(
      'Step 1',
      'Structured Problem Extractor Agent',
      step1StartTime,
    );
    await setState({ ...stateWithMode, stepTimings: [...stateWithMode.stepTimings, timing1] });
    console.log(
      `[Step 1] Structured Problem Extractor Agent finished at ${timing1.endTime} (${timing1.durationMinutes} min).`,
    );

    await emitTraceEvent(writer, {
      type: 'data-agent-reasoning',
      data: {
        stepId,
        agentName: 'Structured Problem Extractor',
        model: activeModelId(modelMode, 'openai/gpt-5-mini'),
        reasoning: response.text || '',
        durationMs: Math.round(timing1.durationMinutes * 60_000),
        timestamp: new Date().toISOString(),
      },
    });

    // validate the agent response against the expected schema so the step returns the correct type
    const parseResult = structuredProblemSchema.safeParse(response.object);

    logAgentOutput(
      logFile,
      'Step 1: Extract Structure',
      'Structured Problem Extractor Agent',
      response.object,
      response.reasoning,
    );

    if (!parseResult.success) {
      logValidationError(logFile, 'Step 1: Extract Structure', parseResult.error);
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

// Step 2: Initial Hypothesizer - generates initial rules and vocabulary
// This step chains two agents:
// 1. Initial Hypothesizer Agent - outputs natural language reasoning with rules and vocabulary
// 2. Initial Hypothesis Extractor Agent - extracts JSON from the natural language output
const initialHypothesisStep = createStep({
  id: 'initial-hypothesis',
  description: 'Step 2: Generate initial rules and vocabulary from structured problem.',
  inputSchema: initialHypothesisInputSchema,
  outputSchema: initialHypothesisOutputSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, mastra, bail, state, setState, writer }) => {
    const structuredProblem = inputData;
    const logFile = state.logFile;

    const stepId: StepId = 'initial-hypothesis';
    await emitTraceEvent(writer, {
      type: 'data-step-start',
      data: { stepId, timestamp: new Date().toISOString() },
    });

    // Rebuild vocabulary state from workflow state
    const vocabularyState = new Map(Object.entries(state.vocabulary));

    // Create RequestContext with vocabulary state and structured problem for the agent
    const requestContext = new RequestContext<WorkflowRequestContext>();
    requestContext.set('vocabulary-state', vocabularyState);
    requestContext.set('log-file', logFile);
    requestContext.set('structured-problem', structuredProblem);
    requestContext.set('model-mode', state.modelMode as ModelMode);
    requestContext.set('step-writer', writer);

    // Step 2a: Call the Initial Rules Hypothesizer Agent (natural language output)
    const vocabulary = Array.from(vocabularyState.values());

    const hypothesizerPrompt =
      'Please analyze the dataset and hypothesize the linguistic rules and extract the vocabulary.\\n\\n' +
      JSON.stringify({ vocabulary, structuredProblem });

    const hypothesizerStartTime = new Date();
    const hypothesizerResponse = await generateWithRetry(
      mastra.getAgentById('initial-hypothesizer'),
      {
        prompt: hypothesizerPrompt,
        options: { maxSteps: 100, requestContext },
      },
    );

    const hypothesizerTiming = recordStepTiming(
      'Step 2a',
      'Initial Hypothesizer Agent',
      hypothesizerStartTime,
    );
    console.log(
      `[Step 2a] Initial Hypothesizer Agent finished at ${hypothesizerTiming.endTime} (${hypothesizerTiming.durationMinutes} min).`,
    );

    await emitTraceEvent(writer, {
      type: 'data-agent-reasoning',
      data: {
        stepId,
        agentName: 'Initial Hypothesizer',
        model: activeModelId(state.modelMode, 'google/gemini-3-flash-preview'),
        reasoning: hypothesizerResponse.text || '',
        durationMs: Math.round(hypothesizerTiming.durationMinutes * 60_000),
        timestamp: new Date().toISOString(),
      },
    });

    // Log the natural language output from the hypothesizer
    logAgentOutput(
      logFile,
      'Step 2a: Initial Hypothesis (Natural Language)',
      'Initial Hypothesizer Agent',
      { naturalLanguageOutput: hypothesizerResponse.text },
      hypothesizerResponse.reasoning,
    );

    // Step 2b: Call the Initial Hypothesis Extractor Agent to parse into JSON
    const extractorPrompt =
      'Please extract the rules and vocabulary from the following linguistic analysis:\\n\\n' +
      hypothesizerResponse.text;

    const extractorStartTime = new Date();
    const extractorResponse = await generateWithRetry(
      mastra.getAgentById('initial-hypothesis-extractor'),
      {
        prompt: extractorPrompt,
        options: {
          maxSteps: 100,
          requestContext,
          structuredOutput: {
            schema: rulesSchema,
          },
        },
      },
    );

    const extractorTiming = recordStepTiming(
      'Step 2b',
      'Initial Hypothesis Extractor Agent',
      extractorStartTime,
    );
    console.log(
      `[Step 2b] Initial Hypothesis Extractor Agent finished at ${extractorTiming.endTime} (${extractorTiming.durationMinutes} min).`,
    );

    await emitTraceEvent(writer, {
      type: 'data-agent-reasoning',
      data: {
        stepId,
        agentName: 'Initial Hypothesis Extractor',
        model: activeModelId(state.modelMode, 'openai/gpt-5-mini'),
        reasoning: extractorResponse.text || '',
        durationMs: Math.round(extractorTiming.durationMinutes * 60_000),
        timestamp: new Date().toISOString(),
      },
    });

    const extractorParseResult = rulesSchema.safeParse(extractorResponse.object);

    logAgentOutput(
      logFile,
      'Step 2b: Initial Hypothesis (JSON Extraction)',
      'Initial Hypothesis Extractor Agent',
      extractorResponse.object,
      extractorResponse.reasoning,
    );

    if (!extractorParseResult.success) {
      logValidationError(
        logFile,
        'Step 2b: Initial Hypothesis (JSON Extraction)',
        extractorParseResult.error,
      );
      return bail({
        success: false,
        message:
          '[Initial Hypothesis Step] Extraction validation failed: ' +
          extractorParseResult.error.message,
      });
    }

    const extractorParsed = extractorParseResult.data;

    if (extractorParsed.success === false || extractorParsed.rules === null) {
      return bail({
        success: false,
        message: '[Initial Hypothesis Step] Extraction failed: ' + extractorParsed.explanation,
      });
    }

    // Save updated vocabulary and timings to state
    await setState({
      ...state,
      vocabulary: Object.fromEntries(vocabularyState),
      stepTimings: [...state.stepTimings, hypothesizerTiming, extractorTiming],
    });

    // Return the initial loop state with hypothesized rules
    await emitTraceEvent(writer, {
      type: 'data-step-complete',
      data: {
        stepId,
        durationMs: Math.round(
          (hypothesizerTiming.durationMinutes + extractorTiming.durationMinutes) * 60_000,
        ),
        timestamp: new Date().toISOString(),
      },
    });

    return {
      structuredProblem,
      rules: extractorParsed.rules,
      testResults: null, // No test results yet
      iterationCount: 0,
    };
  },
});

// This step runs the verify-improve cycle
// It takes the loop state, verifies rules, then improves them
const verifyImproveLoopStep = createStep({
  id: 'verify-improve-rules-loop',
  description: `Step 3: Verify rules and improve based on feedback, up to ${MAX_VERIFY_IMPROVE_ITERATIONS} iterations.`,
  inputSchema: hypothesisTestLoopSchema,
  outputSchema: hypothesisTestLoopSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, mastra, bail, state, setState, writer }) => {
    const { structuredProblem, rules: currentRules, iterationCount } = inputData;
    const logFile = state.logFile;
    let currentStepTimings = [...state.stepTimings];

    const stepId: StepId = 'verify-improve-rules-loop';
    if (iterationCount === 0) {
      await emitTraceEvent(writer, {
        type: 'data-step-start',
        data: { stepId, timestamp: new Date().toISOString() },
      });
    }

    // Rebuild vocabulary state from workflow state
    const vocabularyState = new Map(Object.entries(state.vocabulary));

    // Rules should never be null here (they come from initial hypothesis step)
    if (currentRules === null) {
      return bail({
        success: false,
        message: '[Verify-Improve Loop] Rules must be provided from initial hypothesis step.',
      });
    }

    // Step 3a: Verify rules using the orchestrator (which calls testRule/testSentence tools)
    // This step chains two agents:
    // 1. Verifier Orchestrator Agent - outputs natural language feedback
    // 2. Verifier Feedback Extractor Agent - extracts JSON from the natural language output

    // Create RequestContext with all context needed by tools
    const requestContext = new RequestContext<WorkflowRequestContext>();
    requestContext.set('vocabulary-state', vocabularyState);
    requestContext.set('structured-problem', structuredProblem);
    requestContext.set('current-rules', currentRules);
    requestContext.set('log-file', logFile);
    requestContext.set('model-mode', state.modelMode as ModelMode);
    requestContext.set('step-writer', writer);

    const vocabulary = Array.from(vocabularyState.values());

    await emitTraceEvent(writer, {
      type: 'data-verify-improve-phase',
      data: {
        iteration: iterationCount + 1,
        phase: 'verify-start',
        timestamp: new Date().toISOString(),
      },
    });

    // Note: vocabulary, structuredProblem, rules are passed in the prompt for the agent
    const orchestratorPrompt = JSON.stringify({
      vocabulary,
      structuredProblem,
      rules: currentRules,
    });

    // Step 3a1: Call the Verifier Orchestrator Agent (natural language output)
    const orchestratorStartTime = new Date();
    const orchestratorResponse = await generateWithRetry(
      mastra.getAgentById('verifier-orchestrator'),
      {
        prompt: orchestratorPrompt,
        options: { maxSteps: 100, requestContext },
      },
    );

    const orchestratorTiming = recordStepTiming(
      `Step 3a1 (Iter ${iterationCount + 1})`,
      'Verifier Orchestrator Agent',
      orchestratorStartTime,
    );
    currentStepTimings.push(orchestratorTiming);
    console.log(
      `[Step 3a1] Verifier Orchestrator Agent finished (Iteration ${iterationCount + 1}) at ${orchestratorTiming.endTime} (${orchestratorTiming.durationMinutes} min).`,
    );

    await emitTraceEvent(writer, {
      type: 'data-agent-reasoning',
      data: {
        stepId,
        agentName: `Verifier Orchestrator (Iter ${iterationCount + 1})`,
        model: activeModelId(state.modelMode as ModelMode, 'google/gemini-3-flash-preview'),
        reasoning: orchestratorResponse.text || '',
        durationMs: Math.round(orchestratorTiming.durationMinutes * 60_000),
        timestamp: new Date().toISOString(),
      },
    });

    // Log the natural language output from the orchestrator
    logAgentOutput(
      logFile,
      `Step 3a1: Verify-Improve Loop (Iteration ${iterationCount + 1}) - Verifier (Natural Language)`,
      'Verifier Orchestrator Agent',
      { naturalLanguageOutput: orchestratorResponse.text },
      orchestratorResponse.reasoning,
    );

    // Step 3a2: Call the Verifier Feedback Extractor Agent to parse into JSON
    const verifierExtractorPrompt =
      'Please extract the verification feedback from the following analysis:\\n\\n' +
      orchestratorResponse.text;

    const verifierExtractorStartTime = new Date();
    const verifierExtractorResponse = await generateWithRetry(
      mastra.getAgentById('verifier-feedback-extractor'),
      {
        prompt: verifierExtractorPrompt,
        options: {
          maxSteps: 100,
          requestContext,
          structuredOutput: {
            schema: verifierFeedbackSchema,
          },
        },
      },
    );

    const verifierExtractorTiming = recordStepTiming(
      `Step 3a2 (Iter ${iterationCount + 1})`,
      'Verifier Feedback Extractor Agent',
      verifierExtractorStartTime,
    );
    currentStepTimings.push(verifierExtractorTiming);
    console.log(
      `[Step 3a2] Verifier Feedback Extractor Agent finished (Iteration ${iterationCount + 1}) at ${verifierExtractorTiming.endTime} (${verifierExtractorTiming.durationMinutes} min).`,
    );

    await emitTraceEvent(writer, {
      type: 'data-agent-reasoning',
      data: {
        stepId,
        agentName: `Verifier Feedback Extractor (Iter ${iterationCount + 1})`,
        model: activeModelId(state.modelMode as ModelMode, 'openai/gpt-5-mini'),
        reasoning: verifierExtractorResponse.text || '',
        durationMs: Math.round(verifierExtractorTiming.durationMinutes * 60_000),
        timestamp: new Date().toISOString(),
      },
    });

    const orchestratorParseResult = verifierFeedbackSchema.safeParse(
      verifierExtractorResponse.object,
    );

    logAgentOutput(
      logFile,
      `Step 3a2: Verify-Improve Loop (Iteration ${iterationCount + 1}) - Extractor (JSON)`,
      'Verifier Feedback Extractor Agent',
      verifierExtractorResponse.object,
      verifierExtractorResponse.reasoning,
    );

    if (!orchestratorParseResult.success) {
      logValidationError(
        logFile,
        `Step 3a2: Verify-Improve Loop (Iteration ${iterationCount + 1}) - Extractor`,
        orchestratorParseResult.error,
      );
      return bail({
        success: false,
        message: '[Verify Rules Step] Validation failed: ' + orchestratorParseResult.error.message,
      });
    }

    const verifierFeedback = orchestratorParseResult.data;

    await emitTraceEvent(writer, {
      type: 'data-iteration-update',
      data: {
        iteration: iterationCount + 1,
        conclusion: verifierFeedback.conclusion,
        rulesTestedCount: verifierFeedback.rulesTestedCount,
        errantRulesCount: verifierFeedback.errantRules.length,
        sentencesTestedCount: verifierFeedback.sentencesTestedCount,
        errantSentencesCount: verifierFeedback.errantSentences.length,
        timestamp: new Date().toISOString(),
      },
    });

    await emitTraceEvent(writer, {
      type: 'data-verify-improve-phase',
      data: {
        iteration: iterationCount + 1,
        phase: 'verify-complete',
        timestamp: new Date().toISOString(),
      },
    });

    // If all rules pass, we're done - no need to improve
    if (verifierFeedback.conclusion === 'ALL_RULES_PASS') {
      await setState({ ...state, stepTimings: currentStepTimings });

      await emitTraceEvent(writer, {
        type: 'data-step-complete',
        data: {
          stepId,
          durationMs: Math.round(
            (orchestratorTiming.durationMinutes + verifierExtractorTiming.durationMinutes) * 60_000,
          ),
          timestamp: new Date().toISOString(),
        },
      });

      return {
        structuredProblem,
        rules: currentRules,
        testResults: verifierFeedback,
        iterationCount: iterationCount + 1,
      };
    }

    // Step 3b: Improve rules based on verifier feedback
    // This step chains two agents:
    // 1. Rules Improver Agent - outputs natural language with reasoning and alternatives
    // 2. Rules Improvement Extractor Agent - extracts JSON from the natural language output

    await emitTraceEvent(writer, {
      type: 'data-verify-improve-phase',
      data: {
        iteration: iterationCount + 1,
        phase: 'improve-start',
        timestamp: new Date().toISOString(),
      },
    });

    // Create improver agent with vocabulary tools
    const improverVocabulary = Array.from(vocabularyState.values());

    const improverPrompt =
      'Your previous rules did not fully pass verification. Please improve your rules and vocabulary based on the feedback provided. Think outside the box and generate 2-3 alternative hypotheses for problematic areas.\\n\\n' +
      JSON.stringify({
        vocabulary: improverVocabulary,
        structuredProblem,
        previousRules: currentRules,
        verifierFeedback,
      });

    // Step 3b1: Call the Rules Improver Agent (natural language output)
    const improverStartTime = new Date();
    const improverResponse = await generateWithRetry(mastra.getAgentById('rules-improver'), {
      prompt: improverPrompt,
      options: { maxSteps: 100, requestContext },
    });

    const improverTiming = recordStepTiming(
      `Step 3b1 (Iter ${iterationCount + 1})`,
      'Rules Improver Agent',
      improverStartTime,
    );
    currentStepTimings.push(improverTiming);
    console.log(
      `[Step 3b1] Rules Improver Agent finished (Iteration ${iterationCount + 1}) at ${improverTiming.endTime} (${improverTiming.durationMinutes} min).`,
    );

    await emitTraceEvent(writer, {
      type: 'data-agent-reasoning',
      data: {
        stepId,
        agentName: `Rules Improver (Iter ${iterationCount + 1})`,
        model: activeModelId(state.modelMode as ModelMode, 'google/gemini-3-flash-preview'),
        reasoning: improverResponse.text || '',
        durationMs: Math.round(improverTiming.durationMinutes * 60_000),
        timestamp: new Date().toISOString(),
      },
    });

    // Log the natural language output from the improver
    logAgentOutput(
      logFile,
      `Step 3b1: Verify-Improve Loop (Iteration ${iterationCount + 1}) - Improver (Natural Language)`,
      'Rules Improver Agent',
      { naturalLanguageOutput: improverResponse.text },
      improverResponse.reasoning,
    );

    // Step 3b2: Call the Rules Improvement Extractor Agent to parse into JSON
    const extractorPrompt =
      'Please extract the revised rules and vocabulary from the following improvement analysis:\\n\\n' +
      improverResponse.text;

    const extractorStartTime = new Date();
    const extractorResponse = await generateWithRetry(
      mastra.getAgentById('rules-improvement-extractor'),
      {
        prompt: extractorPrompt,
        options: {
          maxSteps: 100,
          requestContext,
          structuredOutput: {
            schema: rulesSchema,
          },
        },
      },
    );

    const extractorTiming = recordStepTiming(
      `Step 3b2 (Iter ${iterationCount + 1})`,
      'Rules Improvement Extractor Agent',
      extractorStartTime,
    );
    currentStepTimings.push(extractorTiming);
    console.log(
      `[Step 3b2] Rules Improvement Extractor Agent finished (Iteration ${iterationCount + 1}) at ${extractorTiming.endTime} (${extractorTiming.durationMinutes} min).`,
    );

    await emitTraceEvent(writer, {
      type: 'data-agent-reasoning',
      data: {
        stepId,
        agentName: `Rules Improvement Extractor (Iter ${iterationCount + 1})`,
        model: activeModelId(state.modelMode as ModelMode, 'openai/gpt-5-mini'),
        reasoning: extractorResponse.text || '',
        durationMs: Math.round(extractorTiming.durationMinutes * 60_000),
        timestamp: new Date().toISOString(),
      },
    });

    const extractorParseResult = rulesSchema.safeParse(extractorResponse.object);

    logAgentOutput(
      logFile,
      `Step 3b2: Verify-Improve Loop (Iteration ${iterationCount + 1}) - Extractor (JSON)`,
      'Rules Improvement Extractor Agent',
      extractorResponse.object,
      extractorResponse.reasoning,
    );

    if (!extractorParseResult.success) {
      logValidationError(
        logFile,
        `Step 3b2: Verify-Improve Loop (Iteration ${iterationCount + 1}) - Extractor`,
        extractorParseResult.error,
      );
      return bail({
        success: false,
        message:
          '[Improve Rules Step] Extraction validation failed: ' +
          extractorParseResult.error.message,
      });
    }

    const extractorParsed = extractorParseResult.data;

    if (extractorParsed.success === false || extractorParsed.rules === null) {
      return bail({
        success: false,
        message: '[Improve Rules Step] Extraction failed: ' + extractorParsed.explanation,
      });
    }

    // Save updated vocabulary and timings to state
    await setState({
      ...state,
      vocabulary: Object.fromEntries(vocabularyState),
      stepTimings: currentStepTimings,
    });

    await emitTraceEvent(writer, {
      type: 'data-verify-improve-phase',
      data: {
        iteration: iterationCount + 1,
        phase: 'improve-complete',
        timestamp: new Date().toISOString(),
      },
    });

    // Return the updated loop state with improved rules
    return {
      structuredProblem,
      rules: extractorParsed.rules,
      testResults: verifierFeedback,
      iterationCount: iterationCount + 1,
    };
  },
});

// Step 4: Answer questions using the validated rules and vocabulary from state
const answerQuestionsStep = createStep({
  id: 'answer-questions',
  description:
    "Step 4: Answer the user's questions using the validated rules and vocabulary from workflow state.",
  inputSchema: questionAnsweringInputSchema,
  outputSchema: questionsAnsweredSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, mastra, bail, state, setState, writer }) => {
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

    const answererStartTime = new Date();
    const requestContext = new RequestContext<WorkflowRequestContext>();
    requestContext.set('model-mode', state.modelMode as ModelMode);
    const answererResponse = await generateWithRetry(
      mastra.getAgentById('question-answerer'),
      {
        prompt: answererPrompt,
        options: {
          maxSteps: 100,
          requestContext,
          structuredOutput: {
            schema: questionsAnsweredSchema,
          },
        },
      },
    );

    const answererTiming = recordStepTiming('Step 4', 'Question Answerer Agent', answererStartTime);
    const finalStepTimings = [...state.stepTimings, answererTiming];
    console.log(
      `[Step 4] Question Answerer Agent finished at ${answererTiming.endTime} (${answererTiming.durationMinutes} min).`,
    );

    await emitTraceEvent(writer, {
      type: 'data-agent-reasoning',
      data: {
        stepId,
        agentName: 'Question Answerer',
        model: activeModelId(state.modelMode as ModelMode, 'google/gemini-3-flash-preview'),
        reasoning: answererResponse.text || '',
        durationMs: Math.round(answererTiming.durationMinutes * 60_000),
        timestamp: new Date().toISOString(),
      },
    });

    const answererParseResult = questionsAnsweredSchema.safeParse(answererResponse.object);

    logAgentOutput(
      logFile,
      'Step 4: Answer Questions',
      'Question Answerer Agent',
      answererResponse.object,
      answererResponse.reasoning,
    );

    if (!answererParseResult.success) {
      logValidationError(logFile, 'Step 4: Answer Questions', answererParseResult.error);
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

export const solverWorkflow = createWorkflow({
  id: 'solver-workflow',
  inputSchema: rawProblemInputSchema,
  outputSchema: questionsAnsweredSchema,
  stateSchema: workflowStateSchema,
})
  // Step 1: Extract structured problem data from raw text input.
  .then(extractionStep)
  .map(async ({ inputData }) => inputData.data!)
  // Step 2: Generate initial rules and vocabulary.
  .then(initialHypothesisStep)
  // Step 3: Up to 4 iterations, perform the verify-improve loop:
  // - Step 3a: Verify rules using the orchestrator
  // - Step 3b: Improve rules based on verification feedback
  .dountil(verifyImproveLoopStep, async ({ inputData }) => {
    // Exit if max iterations reached or all rules are correct
    if (inputData.iterationCount >= MAX_VERIFY_IMPROVE_ITERATIONS) {
      return true;
    }
    return inputData.testResults?.conclusion === 'ALL_RULES_PASS';
  })
  .map(async ({ inputData }) => ({
    structuredProblem: inputData.structuredProblem,
    rules: inputData.rules!,
  }))
  // Step 4: Answer the user's questions using the validated rules and extracted vocabulary.
  .then(answerQuestionsStep)
  .commit();
