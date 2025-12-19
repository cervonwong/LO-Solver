import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { createTestRuleTool } from './03a-rule-tester-tool';
import { createTestSentenceTool } from './03a-sentence-tester-tool';
import { createVerifierOrchestratorAgent } from './03a-verifier-orchestrator-agent';
import { generateWorkflowIds, logMemoryOperation } from './shared-memory';

const MAX_VERIFY_IMPROVE_ITERATIONS = 4;

// Workflow-level memory IDs (generated per run)
let workflowMemoryIds: { threadId: string; resourceId: string } | null = null;

// Logging utilities
const getLogDirectory = () => process.env.LOG_DIRECTORY || path.join(process.cwd(), 'logs');

const getLogFilePath = () => {
  // Get current time in GMT+8
  const now = new Date();
  const gmt8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const year = gmt8.getUTCFullYear();
  const month = String(gmt8.getUTCMonth() + 1).padStart(2, '0');
  const day = String(gmt8.getUTCDate()).padStart(2, '0');
  const hours = String(gmt8.getUTCHours()).padStart(2, '0');
  const minutes = String(gmt8.getUTCMinutes()).padStart(2, '0');
  const seconds = String(gmt8.getUTCSeconds()).padStart(2, '0');
  const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  return path.join(getLogDirectory(), `workflow-03_${timestamp}.md`);
};

let currentLogFile: string | null = null;
let workflowStartTime: Date | null = null;
let lastStepEndTime: Date | null = null;

// Timing tracking for each step
interface StepTiming {
  stepName: string;
  agentName: string;
  endTime: string; // HH:MM:SS in GMT+8
  durationMinutes: number;
}
const stepTimings: StepTiming[] = [];

const formatTimeGMT8 = (date: Date): string => {
  const gmt8 = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const hours = String(gmt8.getUTCHours()).padStart(2, '0');
  const minutes = String(gmt8.getUTCMinutes()).padStart(2, '0');
  const seconds = String(gmt8.getUTCSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const recordStepTiming = (stepName: string, agentName: string, startTime: Date): void => {
  const endTime = new Date();
  const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
  stepTimings.push({
    stepName,
    agentName,
    endTime: formatTimeGMT8(endTime),
    durationMinutes: Math.round(durationMinutes * 100) / 100,
  });
  lastStepEndTime = endTime;
};

const logWorkflowSummary = (): void => {
  if (!currentLogFile || !workflowStartTime) return;

  const endTime = new Date();
  const totalDurationMinutes = (endTime.getTime() - workflowStartTime.getTime()) / 60000;

  let content = `## Workflow Timing Summary\n\n`;
  content += `**Start Time:** ${formatTimeGMT8(workflowStartTime)}\n`;
  content += `**End Time:** ${formatTimeGMT8(endTime)}\n`;
  content += `**Total Duration:** ${Math.round(totalDurationMinutes * 100) / 100} minutes\n\n`;
  content += `### Step Timings\n\n`;
  content += `| Step | Agent | Finished At | Duration (min) |\n`;
  content += `|------|-------|-------------|----------------|\n`;

  for (const timing of stepTimings) {
    content += `| ${timing.stepName} | ${timing.agentName} | ${timing.endTime} | ${timing.durationMinutes} |\n`;
  }

  content += `\n---\n`;
  fs.appendFileSync(currentLogFile, content);
};

const initializeLogFile = (): string => {
  const logDir = getLogDirectory();
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  currentLogFile = getLogFilePath();
  workflowStartTime = new Date();
  stepTimings.length = 0; // Reset step timings

  // Generate unique memory IDs for this workflow run
  workflowMemoryIds = generateWorkflowIds();

  fs.writeFileSync(
    currentLogFile,
    `# Workflow Execution Log\n\n_Generated: ${new Date().toISOString()}_\n\n**Memory Thread ID:** ${workflowMemoryIds.threadId}\n**Memory Resource ID:** ${workflowMemoryIds.resourceId}\n\n---\n\n`,
  );

  logMemoryOperation(
    currentLogFile,
    'WRITE',
    `Initialized workflow memory IDs: thread=${workflowMemoryIds.threadId}, resource=${workflowMemoryIds.resourceId}`,
  );

  return currentLogFile;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatReasoning = (reasoning: any): string | null => {
  if (!reasoning) {
    return null;
  }
  if (typeof reasoning === 'string') return reasoning;
  if (!Array.isArray(reasoning)) return null;

  const result = reasoning
    .map((chunk: any) => chunk.payload?.text || chunk.text || '')
    .filter((text: string) => text && text !== '[REDACTED]')
    .join('');

  return result || null;
};

const logAgentOutput = (
  stepName: string,
  agentName: string,
  output: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reasoning?: any,
): void => {
  if (!currentLogFile) {
    initializeLogFile();
  }
  let content = `## ${stepName}\n\n**Agent:** ${agentName}\n\n`;

  const formattedReasoning = formatReasoning(reasoning);
  if (formattedReasoning) {
    content += `### Reasoning\n\n${formattedReasoning}\n\n`;
  } else {
    content += `### Reasoning\n\n(Reasoning not provided.)\n\n`;
  }

  content += `### Output\n\n\`\`\`json\n${JSON.stringify(output, null, 2)}\n\`\`\`\n\n---\n\n`;
  fs.appendFileSync(currentLogFile!, content);
};

const logValidationError = (stepName: string, error: z.ZodError): void => {
  if (!currentLogFile) {
    initializeLogFile();
  }
  const content = `## ⚠️ Validation Error: ${stepName}\n\n\`\`\`\n${error.message}\n\`\`\`\n\n**Issues:**\n${error.issues.map((issue) => `- **${issue.path.join('.')}**: ${issue.message}`).join('\n')}\n\n---\n\n`;
  fs.appendFileSync(currentLogFile!, content);
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

const vocabularyEntrySchema = z.object({
  foreignForm: z.string().describe('The foreign language morpheme or word'),
  meaning: z.string().describe('The English meaning or gloss'),
  type: z
    .string()
    .describe(
      'The morpheme type (e.g., noun, verb-root, adjective, pronoun, tense-marker, number-marker, case-marker, agreement-marker, etc.)',
    ),
  notes: z
    .string()
    .describe(
      'Additional notes including dataset item references, allomorphs, combinatorial restrictions, etc.',
    ),
});

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
  // Note: Vocabulary is managed via working memory by the agents, not extracted here
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
// Vocabulary is managed via working memory, not passed in schema
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
  execute: async ({ inputData, mastra, bail }) => {
    // Initialize log file at the start of the workflow
    initializeLogFile();

    const step1StartTime = new Date();
    const response = await mastra
      .getAgentById('wf03-structured-problem-extractor')
      .generate(`${inputData.rawProblemText}`, {
        structuredOutput: {
          schema: structuredProblemSchema,
        },
        memory: {
          thread: workflowMemoryIds!.threadId,
          resource: workflowMemoryIds!.resourceId,
        },
      });

    recordStepTiming('Step 1', 'Structured Problem Extractor Agent', step1StartTime);
    const timing1 = stepTimings[stepTimings.length - 1]!;
    console.log(
      `[Step 1] Structured Problem Extractor Agent finished at ${timing1.endTime} (${timing1.durationMinutes} min).`,
    );

    // validate the agent response against the expected schema so the step returns the correct type
    const parseResult = structuredProblemSchema.safeParse(response.object);

    logAgentOutput(
      'Step 1: Extract Structure',
      'Structured Problem Extractor Agent',
      response.object,
      response.reasoning,
    );

    if (!parseResult.success) {
      logValidationError('Step 1: Extract Structure', parseResult.error);
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
  execute: async ({ inputData, mastra, bail }) => {
    const structuredProblem = inputData;

    // Step 2a: Call the Initial Rules Hypothesizer Agent (natural language output)
    const hypothesizerPrompt =
      'Please analyze the dataset and hypothesize the linguistic rules and extract the vocabulary.\n\n' +
      JSON.stringify({ structuredProblem });

    const hypothesizerStartTime = new Date();
    const hypothesizerResponse = await mastra
      .getAgentById('wf03-initial-hypothesizer')
      .generate(hypothesizerPrompt, {
        memory: {
          thread: workflowMemoryIds!.threadId,
          resource: workflowMemoryIds!.resourceId,
        },
      });

    recordStepTiming('Step 2a', 'Initial Hypothesizer Agent', hypothesizerStartTime);
    const hypothesizerTiming = stepTimings[stepTimings.length - 1]!;
    console.log(
      `[Step 2a] Initial Hypothesizer Agent finished at ${hypothesizerTiming.endTime} (${hypothesizerTiming.durationMinutes} min).`,
    );

    // Log the natural language output from the hypothesizer
    logAgentOutput(
      'Step 2a: Initial Hypothesis (Natural Language)',
      'Initial Hypothesizer Agent',
      { naturalLanguageOutput: hypothesizerResponse.text },
      hypothesizerResponse.reasoning,
    );

    // Step 2b: Call the Initial Hypothesis Extractor Agent to parse into JSON
    const extractorPrompt =
      'Please extract the rules and vocabulary from the following linguistic analysis:\n\n' +
      hypothesizerResponse.text;

    const extractorStartTime = new Date();
    const extractorResponse = await mastra
      .getAgentById('wf03-initial-hypothesis-extractor')
      .generate(extractorPrompt, {
        structuredOutput: {
          schema: rulesSchema,
        },
        memory: {
          thread: workflowMemoryIds!.threadId,
          resource: workflowMemoryIds!.resourceId,
        },
      });

    recordStepTiming('Step 2b', 'Initial Hypothesis Extractor Agent', extractorStartTime);
    const extractorTiming = stepTimings[stepTimings.length - 1]!;
    console.log(
      `[Step 2b] Initial Hypothesis Extractor Agent finished at ${extractorTiming.endTime} (${extractorTiming.durationMinutes} min).`,
    );

    const extractorParseResult = rulesSchema.safeParse(extractorResponse.object);

    logAgentOutput(
      'Step 2b: Initial Hypothesis (JSON Extraction)',
      'Initial Hypothesis Extractor Agent',
      extractorResponse.object,
      extractorResponse.reasoning,
    );

    if (!extractorParseResult.success) {
      logValidationError(
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

    // Note: Vocabulary is managed via working memory by the hypothesizer agent directly

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
  execute: async ({ inputData, mastra, bail }) => {
    const { structuredProblem, rules: currentRules, iterationCount } = inputData;

    // Rules should never be null here (they come from initial hypothesis step)
    if (currentRules === null) {
      return bail({
        success: false,
        message: '[Verify-Improve Loop] Rules must be provided from initial hypothesis step.',
      });
    }

    // Step 3a: Verify rules using the orchestrator (which calls testRule/testSentence tools)
    // Create tools dynamically with current context baked in
    // Note: agent handles vocabulary access via its own working memory
    const testRule = createTestRuleTool(structuredProblem);
    const testSentence = createTestSentenceTool(structuredProblem.context, currentRules);

    // Create orchestrator agent with the dynamic tools
    const orchestratorAgent = createVerifierOrchestratorAgent({ testRule, testSentence });

    // Note: vocabulary not passed - agent reads from working memory
    const orchestratorPrompt = JSON.stringify({
      structuredProblem,
      rules: currentRules,
    });

    const orchestratorStartTime = new Date();
    const orchestratorResponse = await orchestratorAgent.generate(orchestratorPrompt, {
      structuredOutput: {
        schema: verifierFeedbackSchema,
      },
      memory: {
        thread: workflowMemoryIds!.threadId,
        resource: workflowMemoryIds!.resourceId,
      },
    });

    recordStepTiming(
      `Step 3a (Iter ${iterationCount + 1})`,
      'Verifier Orchestrator Agent',
      orchestratorStartTime,
    );
    const orchestratorTiming = stepTimings[stepTimings.length - 1]!;
    console.log(
      `[Step 3a] Verifier Orchestrator Agent finished (Iteration ${iterationCount + 1}) at ${orchestratorTiming.endTime} (${orchestratorTiming.durationMinutes} min).`,
    );

    const orchestratorParseResult = verifierFeedbackSchema.safeParse(orchestratorResponse.object);

    logAgentOutput(
      `Step 3a: Verify-Improve Loop (Iteration ${iterationCount + 1}) - Verifier`,
      'Verifier Orchestrator Agent',
      orchestratorResponse.object,
      orchestratorResponse.reasoning,
    );

    if (!orchestratorParseResult.success) {
      logValidationError(
        `Step 3a: Verify-Improve Loop (Iteration ${iterationCount + 1}) - Verifier`,
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
    const improverPrompt =
      'Your previous rules did not fully pass verification. Please improve your rules and vocabulary based on the feedback provided. Think outside the box and generate 2-3 alternative hypotheses for problematic areas.\n\n' +
      JSON.stringify({
        structuredProblem,
        previousRules: currentRules,
        verifierFeedback,
      });

    // Step 3b1: Call the Rules Improver Agent (natural language output)
    const improverStartTime = new Date();
    const improverResponse = await mastra
      .getAgentById('wf03-rules-improver')
      .generate(improverPrompt, {
        memory: {
          thread: workflowMemoryIds!.threadId,
          resource: workflowMemoryIds!.resourceId,
        },
      });

    recordStepTiming(
      `Step 3b1 (Iter ${iterationCount + 1})`,
      'Rules Improver Agent',
      improverStartTime,
    );
    const improverTiming = stepTimings[stepTimings.length - 1]!;
    console.log(
      `[Step 3b1] Rules Improver Agent finished (Iteration ${iterationCount + 1}) at ${improverTiming.endTime} (${improverTiming.durationMinutes} min).`,
    );

    // Log the natural language output from the improver
    logAgentOutput(
      `Step 3b1: Verify-Improve Loop (Iteration ${iterationCount + 1}) - Improver (Natural Language)`,
      'Rules Improver Agent',
      { naturalLanguageOutput: improverResponse.text },
      improverResponse.reasoning,
    );

    // Step 3b2: Call the Rules Improvement Extractor Agent to parse into JSON
    const extractorPrompt =
      'Please extract the revised rules and vocabulary from the following improvement analysis:\n\n' +
      improverResponse.text;

    const extractorStartTime = new Date();
    const extractorResponse = await mastra
      .getAgentById('wf03-rules-improvement-extractor')
      .generate(extractorPrompt, {
        structuredOutput: {
          schema: rulesSchema,
        },
        memory: {
          thread: workflowMemoryIds!.threadId,
          resource: workflowMemoryIds!.resourceId,
        },
      });

    recordStepTiming(
      `Step 3b2 (Iter ${iterationCount + 1})`,
      'Rules Improvement Extractor Agent',
      extractorStartTime,
    );
    const extractorTiming = stepTimings[stepTimings.length - 1]!;
    console.log(
      `[Step 3b2] Rules Improvement Extractor Agent finished (Iteration ${iterationCount + 1}) at ${extractorTiming.endTime} (${extractorTiming.durationMinutes} min).`,
    );

    const extractorParseResult = rulesSchema.safeParse(extractorResponse.object);

    logAgentOutput(
      `Step 3b2: Verify-Improve Loop (Iteration ${iterationCount + 1}) - Extractor (JSON)`,
      'Rules Improvement Extractor Agent',
      extractorResponse.object,
      extractorResponse.reasoning,
    );

    if (!extractorParseResult.success) {
      logValidationError(
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

    // Note: Vocabulary is managed via working memory by the improver agent directly

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
// Vocabulary is read from working memory, not passed in schema
const questionAnsweringInputSchema = z.object({
  structuredProblem: structuredProblemDataSchema,
  rules: rulesArraySchema,
});

// Step 4: Answer questions using the validated rules and vocabulary from working memory
const answerQuestionsStep = createStep({
  id: 'answer-questions',
  description:
    "Step 4: Answer the user's questions using the validated rules and vocabulary from working memory.",
  inputSchema: questionAnsweringInputSchema,
  outputSchema: questionsAnsweredSchema,
  execute: async ({ inputData, mastra, bail }) => {
    const { structuredProblem, rules } = inputData;

    // Note: vocabulary is not passed - agent reads from working memory directly

    const answererPrompt = JSON.stringify({
      context: structuredProblem.context,
      dataset: structuredProblem.dataset,
      questions: structuredProblem.questions,
      rules: rules,
    });

    const answererStartTime = new Date();
    const answererResponse = await mastra
      .getAgentById('wf03-question-answerer')
      .generate(answererPrompt, {
        structuredOutput: {
          schema: questionsAnsweredSchema,
        },
        memory: {
          thread: workflowMemoryIds!.threadId,
          resource: workflowMemoryIds!.resourceId,
        },
      });

    recordStepTiming('Step 4', 'Question Answerer Agent', answererStartTime);
    const answererTiming = stepTimings[stepTimings.length - 1]!;
    console.log(
      `[Step 4] Question Answerer Agent finished at ${answererTiming.endTime} (${answererTiming.durationMinutes} min).`,
    );

    const answererParseResult = questionsAnsweredSchema.safeParse(answererResponse.object);

    logAgentOutput(
      'Step 4: Answer Questions',
      'Question Answerer Agent',
      answererResponse.object,
      answererResponse.reasoning,
    );

    if (!answererParseResult.success) {
      logValidationError('Step 4: Answer Questions', answererParseResult.error);
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
    logWorkflowSummary();

    return answererParsed;
  },
});

export const workflow03 = createWorkflow({
  id: '03-per-rule-per-sentence-delegation-workflow',
  inputSchema: rawProblemInputSchema,
  outputSchema: questionsAnsweredSchema,
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
