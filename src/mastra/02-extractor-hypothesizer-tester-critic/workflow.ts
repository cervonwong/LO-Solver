import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const MAX_HYPOTHESIS_TEST_ITERATIONS = 5;

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
          z
            .string()
            .describe('Variable fields containing the data (e.g. english, foreign_language)'),
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

// Combined schema for the hypothesis-test loop
// This schema carries all the data needed for both the hypothesizer and tester
const hypothesisTestLoopSchema = z.object({
  // The original structured problem data (immutable through the loop)
  structuredProblem: structuredProblemDataSchema,
  // The current hypothesized rules (updated each iteration)
  rules: rulesArraySchema.nullable(),
  // The test results from the previous iteration (null on first iteration)
  testResults: rulesTestResultsSchema.nullable(),
});

const extractionStep = createStep({
  id: 'extract-structure',
  inputSchema: rawProblemInputSchema,
  outputSchema: structuredProblemSchema,
  execute: async ({ inputData, mastra, bail }) => {
    const response = await mastra
      .getAgent('structuredProblemExtractorAgent')
      .generate(`${inputData.rawProblemText}`, {
        structuredOutput: {
          schema: structuredProblemSchema,
        },
        memory: {
          thread: `from-workflow-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          resource: 'structuredProblemExtractorAgent', // This resource name allows you to see conversation history in agents tab.
        },
      });

    // validate the agent response against the expected schema so the step returns the correct type
    const parsed = structuredProblemSchema.parse(response.object);

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
  inputSchema: hypothesisTestLoopSchema,
  outputSchema: hypothesisTestLoopSchema,
  execute: async ({ inputData, mastra, bail }) => {
    const { structuredProblem, rules: previousRules, testResults: previousTestResults } = inputData;

    // Step 1: Hypothesize rules (or revise if we have previous test results)
    const hypothesizerPrompt =
      previousTestResults !== null
        ? JSON.stringify({
            structuredProblem,
            previousRules,
            testFeedback: previousTestResults,
            instruction:
              'Your previous rules did not pass the test. Please revise your rules based on the feedback provided.',
          })
        : JSON.stringify({
            structuredProblem,
            instruction: 'Please analyze the dataset and hypothesize the linguistic rules.',
          });

    const hypothesizerResponse = await mastra
      .getAgent('rulesHypothesizerAgent')
      .generate(hypothesizerPrompt, {
        structuredOutput: {
          schema: rulesSchema,
        },
        memory: {
          thread: `from-workflow-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          resource: 'rulesHypothesizerAgent',
        },
      });

    const hypothesizerParsed = rulesSchema.parse(hypothesizerResponse.object);

    if (hypothesizerParsed.success === false || hypothesizerParsed.rules === null) {
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

    const testerResponse = await mastra.getAgent('rulesTesterAgent').generate(testerPrompt, {
      structuredOutput: {
        schema: rulesTestResultsSchema,
      },
      memory: {
        thread: `from-workflow-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        resource: 'rulesTesterAgent',
      },
    });

    const testerParsed = rulesTestResultsSchema.parse(testerResponse.object);

    // Return the updated loop state
    return {
      structuredProblem,
      rules: hypothesizerParsed.rules,
      testResults: testerParsed,
    };
  },
});

// Final step to extract the rules from the loop state
const extractFinalRulesStep = createStep({
  id: 'extract-final-rules',
  inputSchema: hypothesisTestLoopSchema,
  outputSchema: rulesSchema,
  execute: async ({ inputData }) => {
    return {
      success: true,
      explanation: `Rules validated successfully. Test conclusion: ${inputData.testResults?.conclusion}. ${inputData.testResults?.explanation}`,
      rules: inputData.rules,
    };
  },
});

const extractorHypothesizerTesterCriticWorkflow = createWorkflow({
  id: 'extractor-hypothesizer-tester-critic-workflow',
  inputSchema: rawProblemInputSchema,
  outputSchema: rulesSchema,
})
  .then(extractionStep)
  // Map the extraction output to the loop input schema
  .map(async ({ inputData }) => ({
    structuredProblem: inputData.data!,
    rules: null,
    testResults: null,
  }))
  // Loop until rules pass the test or max iterations reached
  .dountil(hypothesisAndTestLoopStep, async ({ inputData, iterationCount }) => {
    // Stop if max iterations reached
    if (iterationCount >= MAX_HYPOTHESIS_TEST_ITERATIONS) {
      console.warn(
        `[Hypothesis-Test Loop] Max iterations (${MAX_HYPOTHESIS_TEST_ITERATIONS}) reached. Proceeding with current rules.`,
      );
      return true;
    }
    // Stop if all rules are correct
    return inputData.testResults?.conclusion === 'All rules correct';
  })
  .then(extractFinalRulesStep)
  .commit();

export { extractorHypothesizerTesterCriticWorkflow };
