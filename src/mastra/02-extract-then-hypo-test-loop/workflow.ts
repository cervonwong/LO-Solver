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
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(getLogDirectory(), `workflow-${timestamp}.md`);
};

let currentLogFile: string | null = null;

const initializeLogFile = (): string => {
  const logDir = getLogDirectory();
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  currentLogFile = getLogFilePath();
  fs.writeFileSync(
    currentLogFile,
    `# Workflow Execution Log\n\n_Generated: ${new Date().toISOString()}_\n\n---\n\n`,
  );
  return currentLogFile;
};

const logAgentOutput = (stepName: string, agentName: string, output: unknown): void => {
  if (!currentLogFile) {
    initializeLogFile();
  }
  const content = `## ${stepName}\n\n**Agent:** ${agentName}\n\n\`\`\`json\n${JSON.stringify(output, null, 2)}\n\`\`\`\n\n---\n\n`;
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

    const response = await mastra
      .getAgent('wf02_structuredProblemExtractorAgent')
      .generate(`${inputData.rawProblemText}`, {
        structuredOutput: {
          schema: structuredProblemSchema,
        },
      });

    // validate the agent response against the expected schema so the step returns the correct type
    const parsed = structuredProblemSchema.parse(response.object);

    logAgentOutput('Step 1: Extract Structure', 'Structured Problem Extractor Agent', parsed);

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

    const hypothesizerResponse = await mastra
      .getAgent('wf02_rulesHypothesizerAgent')
      .generate(hypothesizerPrompt, {
        structuredOutput: {
          schema: rulesSchema,
          model: openrouter('openai/gpt-5-mini'),
        },
      });

    const hypothesizerParsed = rulesSchema.parse(hypothesizerResponse.object);

    logAgentOutput(
      `Step 2: Hypothesis-Test Loop (Iteration ${iterationCount + 1})`,
      'Rules Hypothesizer Agent',
      hypothesizerParsed,
    );

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

    const testerResponse = await mastra.getAgent('wf02_rulesTesterAgent').generate(testerPrompt, {
      structuredOutput: {
        schema: rulesTestResultsSchema,
        model: openrouter('openai/gpt-5-mini'),
      },
    });

    const testerParsed = rulesTestResultsSchema.parse(testerResponse.object);

    logAgentOutput(
      `Step 2: Hypothesis-Test Loop (Iteration ${iterationCount + 1})`,
      'Rules Tester Agent',
      testerParsed,
    );

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

    const answererResponse = await mastra
      .getAgent('wf02_questionAnswererAgent')
      .generate(answererPrompt, {
        structuredOutput: {
          schema: questionsAnsweredSchema,
          model: openrouter('openai/gpt-5-mini'),
        },
      });

    const answererParsed = questionsAnsweredSchema.parse(answererResponse.object);

    logAgentOutput('Step 3: Answer Questions', 'Question Answerer Agent', answererParsed);

    if (answererParsed.success === false) {
      return bail({
        success: false,
        message:
          '[Answer Questions Step] Failed to answer questions: ' + answererParsed.explanation,
      });
    }

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
