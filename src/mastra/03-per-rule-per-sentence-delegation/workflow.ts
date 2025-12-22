import { createStep, createWorkflow } from '@mastra/core/workflows';
import { RequestContext } from '@mastra/core/request-context';
import { z } from 'zod';
import { vocabularyEntrySchema, type VocabularyEntry } from './vocabulary-tools';
import type { Workflow03RequestContext } from './request-context-types';
import {
  type StepTiming,
  getLogFilePath,
  initializeLogFile,
  recordStepTiming,
  logWorkflowSummary,
  logAgentOutput,
  logValidationError,
} from './logging-utils';

const MAX_VERIFY_IMPROVE_ITERATIONS = 4;

// Step timing schema for workflow state
const stepTimingSchema = z.object({
  stepName: z.string(),
  agentName: z.string(),
  endTime: z.string(), // HH:MM:SS in GMT+8
  durationMinutes: z.number(),
});

// Workflow state schema - per-run isolated state
// All fields have defaults so workflow can start without initialState
export const workflowStateSchema = z.object({
  vocabulary: z.record(z.string(), vocabularyEntrySchema).default({}), // Vocabulary keyed by foreignForm
  logFile: z.string().default(''), // Will be set in first step
  startTime: z.string().default(''), // Will be set in first step (ISO string)
  stepTimings: z.array(stepTimingSchema).default([]),
});

export type WorkflowState = z.infer<typeof workflowStateSchema>;

// Initialize workflow state - returns initial state object
const initializeWorkflowState = (): WorkflowState => {
  const logFile = getLogFilePath();
  const startTime = new Date().toISOString();
  initializeLogFile(logFile, startTime);

  return {
    vocabulary: {},
    logFile,
    startTime,
    stepTimings: [],
  };
};

const rawProblemInputSchema = z.object({
  rawProblemText: z.string(),
});

const structuredProblemDataSchema = z.object({
  context: z
    .string()
    .describe('Relevant linguistic, grammatical, and orthographic notes. Exclude trivia.'),
  dataset: z
    .array(
      z
        .object({
          id: z.string().describe('Sequential ID (1, 2, 3...)'),
        })
        .catchall(
          z.string().describe('Variable fields containing the data (e.g. english, foreignForm)'),
        ),
    )
    .describe('Core data for analysis. Complete pairs only.'),
  questions: z
    .array(
      z.object({
        id: z.string().describe('Sequential Question ID (Q1, Q2, Q3...)'),
        type: z.string().describe("Task type (e.g. 'translate-to-english', 'translate-to-target')"),
        input: z.string().describe('The input phrase or sentence to be processed'),
      }),
    )
    .describe('Specific questions the user needs to answer'),
});

const structuredProblemSchema = z.object({
  success: z
    .boolean()
    .describe(
      'Set to true if a dataset and questions were found. Set to false if they are missing.',
    ),
  explanation: z
    .string()
    .describe('If success is false, explain what is missing. If true, provide a brief summary.'),
  data: structuredProblemDataSchema
    .nullable()
    .describe('The extracted problem data. Null if success is false.'),
});

const rulesArraySchema = z.array(
  z.object({
    title: z
      .string()
      .describe(
        'A short title that groups or organises the rule (e.g. "Sentence syntax", "Verb agreement", "Noun cases")',
      ),
    description: z
      .string()
      .describe('A detailed description of the rule, such as grammar patterns or phonetic changes'),
    confidence: z
      .enum(['HIGH', 'MEDIUM', 'LOW'])
      .describe('Confidence level for this rule based on evidence strength'),
  }),
);

// Note: vocabularyEntrySchema is imported from vocabulary-tools.ts

const vocabularyArraySchema = z.array(vocabularyEntrySchema);

const rulesSchema = z.object({
  success: z
    .boolean()
    .describe(
      'Set to true if rules were successfully extracted. Set to false if extraction failed.',
    ),
  explanation: z
    .string()
    .describe('If success is false, explain what went wrong. If true, provide a brief summary.'),
  rules: rulesArraySchema
    .nullable()
    .describe(
      'An ordered list of rules extracted from the linguistic data. Null if success is false.',
    ),
  // Note: Vocabulary is managed via workflow state, not extracted in this schema
});

// Schema for the verifier orchestrator's aggregated feedback
const issueSchema = z.object({
  title: z.string().describe('Short title summarizing the issue'),
  description: z
    .string()
    .describe(
      'Detailed description of the issue, citing specific affected rules (by title) and sentences (by ID like #1, Q2)',
    ),
  recommendation: z.string().describe('Actionable fix for this issue'),
});

const missingRuleSchema = z.object({
  pattern: z.string().describe('The pattern in the data that no existing rule explains'),
  suggestedRule: z.string().describe('Description of the new rule that is needed'),
  evidence: z.array(z.string()).describe('Sentence IDs that demonstrate this pattern'),
});

const verifierFeedbackSchema = z.object({
  fullExplanation: z.string().describe('Detailed explanation of testing results'),
  rulesTestedCount: z.number().describe('Number of rules tested'),
  errantRules: z
    .array(z.string())
    .describe('List of rule titles that had issues or failed verification'),
  sentencesTestedCount: z.number().describe('Number of sentences tested'),
  errantSentences: z
    .array(z.string())
    .describe('List of sentence IDs (e.g., #1, #5, Q2) that could not be translated correctly'),
  issues: z.array(issueSchema).describe('List of issues found during verification'),
  missingRules: z
    .array(missingRuleSchema)
    .describe('Patterns in the data that no existing rule explains'),
  topRecommendations: z.array(z.string()).describe('Top 5 most important fixes, ranked by impact'),
  conclusion: z
    .enum(['ALL_RULES_PASS', 'NEEDS_IMPROVEMENT', 'MAJOR_ISSUES'])
    .describe(
      'Overall conclusion: ALL_RULES_PASS means ruleset is complete and correct, NEEDS_IMPROVEMENT means some issues found, MAJOR_ISSUES means significant problems.',
    ),
});

const questionAnswerSchema = z.object({
  questionId: z.string().describe('The ID of the question being answered (e.g., Q1, Q2)'),
  answer: z.string().describe('The final translated phrase or answer'),
  workingSteps: z
    .string()
    .describe(
      'Step-by-step breakdown showing how the answer was derived, including morpheme segmentation, rule application, and glosses',
    ),
  confidence: z
    .enum(['HIGH', 'MEDIUM', 'LOW'])
    .describe('Confidence level for this answer based on rule coverage and ambiguity'),
  confidenceReasoning: z
    .string()
    .describe('Brief explanation of why this confidence level was assigned'),
});

const questionsAnsweredSchema = z.object({
  success: z
    .boolean()
    .describe(
      'Set to true if all questions were successfully answered. Set to false if unable to answer due to missing rules, ambiguity, or other issues.',
    ),
  explanation: z
    .string()
    .describe(
      'If success is false, explain which questions could not be answered and why. If true, provide a brief summary.',
    ),
  answers: z
    .array(questionAnswerSchema)
    .nullable()
    .describe('Array of answers for each question. Null if success is false.'),
});

// Combined schema for the hypothesis-test loop
// This schema carries all the data needed for both the hypothesizer and tester
// Vocabulary is managed via workflow state, not passed in this schema
const hypothesisTestLoopSchema = z.object({
  // The original structured problem data (immutable through the loop)
  structuredProblem: structuredProblemDataSchema,
  // The current hypothesized rules (null on first iteration, updated each iteration)
  rules: rulesArraySchema.nullable(),
  // The test results from the previous iteration (null on first iteration, updated each iteration)
  testResults: verifierFeedbackSchema.nullable(),
  // The current iteration count (for tracking purposes, not passed to agents)
  iterationCount: z.number(),
});

const extractionStep = createStep({
  id: 'extract-structure',
  description: 'Step 1: Extract structured problem data from raw text input.',
  inputSchema: rawProblemInputSchema,
  outputSchema: structuredProblemSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, mastra, bail, state, setState }) => {
    // Initialize workflow state at the start of the workflow
    const initialState = initializeWorkflowState();
    await setState(initialState);
    const logFile = initialState.logFile;

    const step1StartTime = new Date();
    const response = await mastra
      .getAgentById('wf03-structured-problem-extractor')
      .generate(`${inputData.rawProblemText}`, {
        maxSteps: 100,
        structuredOutput: {
          schema: structuredProblemSchema,
        },
      });

    const timing1 = recordStepTiming(
      'Step 1',
      'Structured Problem Extractor Agent',
      step1StartTime,
    );
    await setState({ ...initialState, stepTimings: [...initialState.stepTimings, timing1] });
    console.log(
      `[Step 1] Structured Problem Extractor Agent finished at ${timing1.endTime} (${timing1.durationMinutes} min).`,
    );

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

    return parsed;
  },
});

// Schema for initial hypothesis step input
const initialHypothesisInputSchema = structuredProblemDataSchema;

// Schema for initial hypothesis step output (includes rules, vocabulary, and loop state)
const initialHypothesisOutputSchema = hypothesisTestLoopSchema;

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
  execute: async ({ inputData, mastra, bail, state, setState }) => {
    const structuredProblem = inputData;
    const logFile = state.logFile;

    // Rebuild vocabulary state from workflow state
    const vocabularyState = new Map(Object.entries(state.vocabulary));

    // Create RequestContext with vocabulary state and structured problem for the agent
    const requestContext = new RequestContext<Workflow03RequestContext>();
    requestContext.set('vocabulary-state', vocabularyState);
    requestContext.set('log-file', logFile);
    requestContext.set('structured-problem', structuredProblem);

    // Step 2a: Call the Initial Rules Hypothesizer Agent (natural language output)
    const vocabulary = Array.from(vocabularyState.values());

    const hypothesizerPrompt =
      'Please analyze the dataset and hypothesize the linguistic rules and extract the vocabulary.\\n\\n' +
      JSON.stringify({ vocabulary, structuredProblem });

    const hypothesizerStartTime = new Date();
    const hypothesizerResponse = await mastra
      .getAgentById('wf03-initial-hypothesizer')
      .generate(hypothesizerPrompt, { maxSteps: 100, requestContext });

    const hypothesizerTiming = recordStepTiming(
      'Step 2a',
      'Initial Hypothesizer Agent',
      hypothesizerStartTime,
    );
    console.log(
      `[Step 2a] Initial Hypothesizer Agent finished at ${hypothesizerTiming.endTime} (${hypothesizerTiming.durationMinutes} min).`,
    );

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
    const extractorResponse = await mastra
      .getAgentById('wf03-initial-hypothesis-extractor')
      .generate(extractorPrompt, {
        maxSteps: 100,
        structuredOutput: {
          schema: rulesSchema,
        },
      });

    const extractorTiming = recordStepTiming(
      'Step 2b',
      'Initial Hypothesis Extractor Agent',
      extractorStartTime,
    );
    console.log(
      `[Step 2b] Initial Hypothesis Extractor Agent finished at ${extractorTiming.endTime} (${extractorTiming.durationMinutes} min).`,
    );

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
  execute: async ({ inputData, mastra, bail, state, setState }) => {
    const { structuredProblem, rules: currentRules, iterationCount } = inputData;
    const logFile = state.logFile;
    let currentStepTimings = [...state.stepTimings];

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
    const requestContext = new RequestContext<Workflow03RequestContext>();
    requestContext.set('vocabulary-state', vocabularyState);
    requestContext.set('structured-problem', structuredProblem);
    requestContext.set('current-rules', currentRules);
    requestContext.set('log-file', logFile);

    const vocabulary = Array.from(vocabularyState.values());

    // Note: vocabulary, structuredProblem, rules are passed in the prompt for the agent
    const orchestratorPrompt = JSON.stringify({
      vocabulary,
      structuredProblem,
      rules: currentRules,
    });

    // Step 3a1: Call the Verifier Orchestrator Agent (natural language output)
    const orchestratorStartTime = new Date();
    const orchestratorResponse = await mastra
      .getAgentById('wf03-verifier-orchestrator')
      .generate(orchestratorPrompt, { maxSteps: 100, requestContext });

    const orchestratorTiming = recordStepTiming(
      `Step 3a1 (Iter ${iterationCount + 1})`,
      'Verifier Orchestrator Agent',
      orchestratorStartTime,
    );
    currentStepTimings.push(orchestratorTiming);
    console.log(
      `[Step 3a1] Verifier Orchestrator Agent finished (Iteration ${iterationCount + 1}) at ${orchestratorTiming.endTime} (${orchestratorTiming.durationMinutes} min).`,
    );

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
    const verifierExtractorResponse = await mastra
      .getAgentById('wf03-verifier-feedback-extractor')
      .generate(verifierExtractorPrompt, {
        maxSteps: 100,
        structuredOutput: {
          schema: verifierFeedbackSchema,
        },
      });

    const verifierExtractorTiming = recordStepTiming(
      `Step 3a2 (Iter ${iterationCount + 1})`,
      'Verifier Feedback Extractor Agent',
      verifierExtractorStartTime,
    );
    currentStepTimings.push(verifierExtractorTiming);
    console.log(
      `[Step 3a2] Verifier Feedback Extractor Agent finished (Iteration ${iterationCount + 1}) at ${verifierExtractorTiming.endTime} (${verifierExtractorTiming.durationMinutes} min).`,
    );

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

    // If all rules pass, we're done - no need to improve
    if (verifierFeedback.conclusion === 'ALL_RULES_PASS') {
      await setState({ ...state, stepTimings: currentStepTimings });
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
    const improverResponse = await mastra
      .getAgentById('wf03-rules-improver')
      .generate(improverPrompt, { maxSteps: 100, requestContext });

    const improverTiming = recordStepTiming(
      `Step 3b1 (Iter ${iterationCount + 1})`,
      'Rules Improver Agent',
      improverStartTime,
    );
    currentStepTimings.push(improverTiming);
    console.log(
      `[Step 3b1] Rules Improver Agent finished (Iteration ${iterationCount + 1}) at ${improverTiming.endTime} (${improverTiming.durationMinutes} min).`,
    );

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
    const extractorResponse = await mastra
      .getAgentById('wf03-rules-improvement-extractor')
      .generate(extractorPrompt, {
        maxSteps: 100,
        structuredOutput: {
          schema: rulesSchema,
        },
      });

    const extractorTiming = recordStepTiming(
      `Step 3b2 (Iter ${iterationCount + 1})`,
      'Rules Improvement Extractor Agent',
      extractorStartTime,
    );
    currentStepTimings.push(extractorTiming);
    console.log(
      `[Step 3b2] Rules Improvement Extractor Agent finished (Iteration ${iterationCount + 1}) at ${extractorTiming.endTime} (${extractorTiming.durationMinutes} min).`,
    );

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

    // Return the updated loop state with improved rules
    return {
      structuredProblem,
      rules: extractorParsed.rules,
      testResults: verifierFeedback,
      iterationCount: iterationCount + 1,
    };
  },
});

// Schema for the question answering step input
// Vocabulary is read from workflow state, not passed in this schema
const questionAnsweringInputSchema = z.object({
  structuredProblem: structuredProblemDataSchema,
  rules: rulesArraySchema,
});

// Step 4: Answer questions using the validated rules and vocabulary from state
const answerQuestionsStep = createStep({
  id: 'answer-questions',
  description:
    "Step 4: Answer the user's questions using the validated rules and vocabulary from workflow state.",
  inputSchema: questionAnsweringInputSchema,
  outputSchema: questionsAnsweredSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, mastra, bail, state, setState }) => {
    const { structuredProblem, rules } = inputData;
    const logFile = state.logFile;

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
    const answererResponse = await mastra
      .getAgentById('wf03-question-answerer')
      .generate(answererPrompt, {
        maxSteps: 100,
        structuredOutput: {
          schema: questionsAnsweredSchema,
        },
      });

    const answererTiming = recordStepTiming('Step 4', 'Question Answerer Agent', answererStartTime);
    const finalStepTimings = [...state.stepTimings, answererTiming];
    console.log(
      `[Step 4] Question Answerer Agent finished at ${answererTiming.endTime} (${answererTiming.durationMinutes} min).`,
    );

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

    return answererParsed;
  },
});

export const workflow03 = createWorkflow({
  id: '03-per-rule-per-sentence-delegation-workflow',
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
