import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import * as fs from 'fs';
import * as path from 'path';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const MAX_HYPOTHESIS_TEST_ITERATIONS = 5;

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
  return path.join(getLogDirectory(), `workflow-02_${timestamp}.md`);
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
  fs.writeFileSync(
    currentLogFile,
    `# Workflow Execution Log\n\n_Generated: ${new Date().toISOString()}_\n\n---\n\n`,
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
      'Set to true if rules and vocabulary were successfully extracted. Set to false if extraction failed.',
    ),
  explanation: z
    .string()
    .describe('If success is false, explain what went wrong. If true, provide a brief summary.'),
  rules: rulesArraySchema
    .nullable()
    .describe(
      'An ordered list of rules extracted from the linguistic data. Null if success is false.',
    ),
  vocabulary: vocabularyArraySchema
    .nullable()
    .describe(
      'A comprehensive vocabulary list (lexicon) mapping foreign language morphemes/words to their English meanings. Null if success is false.',
    ),
});

const rulesTestResultsSchema = z.object({
  conclusion: z
    .enum(['All rules correct', 'Insufficient rules', 'Some rules incorrect'])
    .describe(
      'Enum indicating the overall result of the rules testing. "All rules correct" means all hypothesized rules passed the tests. "Insufficient rules" means the rules are not enough to translate the sentences in the dataset (ambiguous). "Some rules incorrect" means some rules do not fit the dataset.',
    ),
  explanation: z
    .string()
    .describe(
      'A detailed explanation of the testing results, including which rules passed or failed and why.',
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
const hypothesisTestLoopSchema = z.object({
  // The original structured problem data (immutable through the loop)
  structuredProblem: structuredProblemDataSchema,
  // The current hypothesized rules (null on first iteration, updated each iteration)
  rules: rulesArraySchema.nullable(),
  // The current vocabulary list (null on first iteration, updated each iteration)
  vocabulary: vocabularyArraySchema.nullable(),
  // The test results from the previous iteration (null on first iteration, updated each iteration)
  testResults: rulesTestResultsSchema.nullable(),
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
      .getAgent('wf02_structuredProblemExtractorAgent')
      .generate(`${inputData.rawProblemText}`, {
        structuredOutput: {
          schema: structuredProblemSchema,
        },
      });

    recordStepTiming('Step 1', 'Structured Problem Extractor Agent', step1StartTime);
    const timing1 = stepTimings[stepTimings.length - 1];
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

// This step runs the hypothesis-test cycle
// It takes the loop state, generates/revises rules, tests them, and returns the updated state
const hypothesisAndTestLoopStep = createStep({
  id: 'hypothesize-and-test-rules-loop',
  description: `Step 2: Hypothesize, test+critic, then revise linguistic rules and vocabulary, up to ${MAX_HYPOTHESIS_TEST_ITERATIONS} iterations.`,
  inputSchema: hypothesisTestLoopSchema,
  outputSchema: hypothesisTestLoopSchema,
  execute: async ({ inputData, mastra, bail }) => {
    const {
      structuredProblem,
      rules: previousRules,
      vocabulary: previousVocabulary,
      testResults: previousTestResults,
      iterationCount,
    } = inputData;

    // Step 1: Hypothesize rules and vocabulary (or revise if we have previous test results)
    const hypothesizerPrompt =
      previousTestResults !== null
        ? 'Your previous rules did not pass the test. Please revise your rules and vocabulary based on the feedback provided.\n\n' +
          JSON.stringify({
            structuredProblem,
            previousRules,
            previousVocabulary,
            testFeedback: previousTestResults,
          })
        : 'Please analyze the dataset and hypothesize the linguistic rules and extract the vocabulary.\n\n' +
          JSON.stringify({
            structuredProblem,
          });

    const hypothesizerStartTime = new Date();
    const hypothesizerResponse = await mastra
      .getAgent('wf02_rulesHypothesizerAgent')
      .generate(hypothesizerPrompt, {
        structuredOutput: {
          schema: rulesSchema,
          model: openrouter('openai/gpt-5-mini'),
        },
      });

    recordStepTiming(
      `Step 2 (Iter ${iterationCount + 1})`,
      'Rules Hypothesizer Agent',
      hypothesizerStartTime,
    );
    const hypothesizerTiming = stepTimings[stepTimings.length - 1];
    console.log(
      `[Step 2] Rules Hypothesizer Agent finished (Iteration ${iterationCount + 1}) at ${hypothesizerTiming.endTime} (${hypothesizerTiming.durationMinutes} min).`,
    );

    const hypothesizerParseResult = rulesSchema.safeParse(hypothesizerResponse.object);

    logAgentOutput(
      `Step 2: Hypothesis-Test Loop (Iteration ${iterationCount + 1})`,
      'Rules Hypothesizer Agent',
      hypothesizerResponse.object,
      hypothesizerResponse.reasoning,
    );

    if (!hypothesizerParseResult.success) {
      logValidationError(
        `Step 2: Hypothesis-Test Loop (Iteration ${iterationCount + 1}) - Hypothesizer`,
        hypothesizerParseResult.error,
      );
      return bail({
        success: false,
        message:
          '[Hypothesize Rules Step] Validation failed: ' + hypothesizerParseResult.error.message,
      });
    }

    const hypothesizerParsed = hypothesizerParseResult.data;

    if (
      hypothesizerParsed.success === false ||
      hypothesizerParsed.rules === null ||
      hypothesizerParsed.vocabulary === null
    ) {
      return bail({
        success: false,
        message: '[Hypothesize Rules Step] Hypothesis failed: ' + hypothesizerParsed.explanation,
      });
    }

    // Step 2: Test the hypothesized rules
    const testerPrompt = JSON.stringify({
      structuredProblem,
      rules: hypothesizerParsed.rules,
    });

    const testerStartTime = new Date();
    const testerResponse = await mastra.getAgent('wf02_rulesTesterAgent').generate(testerPrompt, {
      structuredOutput: {
        schema: rulesTestResultsSchema,
        model: openrouter('openai/gpt-5-mini'),
      },
    });

    recordStepTiming(`Step 2 (Iter ${iterationCount + 1})`, 'Rules Tester Agent', testerStartTime);
    const testerTiming = stepTimings[stepTimings.length - 1];
    console.log(
      `[Step 2] Rules Tester Agent finished (Iteration ${iterationCount + 1}) at ${testerTiming.endTime} (${testerTiming.durationMinutes} min).`,
    );

    const testerParseResult = rulesTestResultsSchema.safeParse(testerResponse.object);

    logAgentOutput(
      `Step 2: Hypothesis-Test Loop (Iteration ${iterationCount + 1})`,
      'Rules Tester Agent',
      testerResponse.object,
      testerResponse.reasoning,
    );

    if (!testerParseResult.success) {
      logValidationError(
        `Step 2: Hypothesis-Test Loop (Iteration ${iterationCount + 1}) - Tester`,
        testerParseResult.error,
      );
      return bail({
        success: false,
        message: '[Test Rules Step] Validation failed: ' + testerParseResult.error.message,
      });
    }

    const testerParsed = testerParseResult.data;

    // Return the updated loop state
    return {
      structuredProblem,
      rules: hypothesizerParsed.rules,
      vocabulary: hypothesizerParsed.vocabulary,
      testResults: testerParsed,
      iterationCount: iterationCount + 1,
    };
  },
});

// Schema for the question answering step input
const questionAnsweringInputSchema = z.object({
  structuredProblem: structuredProblemDataSchema,
  rules: rulesArraySchema,
  vocabulary: vocabularyArraySchema,
});

// Step to answer questions using the validated rules and vocabulary
const answerQuestionsStep = createStep({
  id: 'answer-questions',
  description:
    "Step 3: Answer the user's questions using the validated rules and extracted vocabulary.",
  inputSchema: questionAnsweringInputSchema,
  outputSchema: questionsAnsweredSchema,
  execute: async ({ inputData, mastra, bail }) => {
    const { structuredProblem, rules, vocabulary } = inputData;

    const answererPrompt = JSON.stringify({
      context: structuredProblem.context,
      dataset: structuredProblem.dataset,
      questions: structuredProblem.questions,
      rules: rules,
      vocabulary: vocabulary,
    });

    const answererStartTime = new Date();
    const answererResponse = await mastra
      .getAgent('wf02_questionAnswererAgent')
      .generate(answererPrompt, {
        structuredOutput: {
          schema: questionsAnsweredSchema,
          model: openrouter('openai/gpt-5-mini'),
        },
      });

    recordStepTiming('Step 3', 'Question Answerer Agent', answererStartTime);
    const answererTiming = stepTimings[stepTimings.length - 1];
    console.log(
      `[Step 3] Question Answerer Agent finished at ${answererTiming.endTime} (${answererTiming.durationMinutes} min).`,
    );

    const answererParseResult = questionsAnsweredSchema.safeParse(answererResponse.object);

    logAgentOutput(
      'Step 3: Answer Questions',
      'Question Answerer Agent',
      answererResponse.object,
      answererResponse.reasoning,
    );

    if (!answererParseResult.success) {
      logValidationError('Step 3: Answer Questions', answererParseResult.error);
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

export const extractThenHypoTestLoopWorkflow = createWorkflow({
  id: '02-extract-then-hypo-test-loop-workflow',
  inputSchema: rawProblemInputSchema,
  outputSchema: questionsAnsweredSchema,
})
  // Step 1: Extract structured problem data from raw text input.
  .then(extractionStep)
  .map(async ({ inputData }) => ({
    structuredProblem: inputData.data!,
    rules: null, // Initially no rules
    vocabulary: null, // Initially no vocabulary
    testResults: null, // Initially no test results
    iterationCount: 0,
  }))
  // Step 2: Up to 5 iterations, perform the hypothesis-test loop:
  // - Hypothesize or revise rules and vocabulary based on previous test results.
  // - Test the hypothesized rules against the dataset.
  .dountil(hypothesisAndTestLoopStep, async ({ inputData }) => {
    // Exit if max iterations reached or all rules are correct
    if (inputData.iterationCount >= MAX_HYPOTHESIS_TEST_ITERATIONS) {
      return true;
    }
    return inputData.testResults?.conclusion === 'All rules correct';
  })
  .map(async ({ inputData }) => ({
    structuredProblem: inputData.structuredProblem,
    rules: inputData.rules!,
    vocabulary: inputData.vocabulary!,
  }))
  // Step 3: Answer the user's questions using the validated rules and extracted vocabulary.
  .then(answerQuestionsStep)
  .commit();
