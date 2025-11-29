import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const MAX_HYPOTHESIS_TEST_ITERATIONS = 5;

const rawProblemInputSchema = z.object({
  rawProblemText: z.string(),
});

// Helper to generate a unique workflow run ID
const generateWorkflowRunId = () =>
  `workflow-run-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

// Helper to create an onChunk handler for agent execution logging
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createChunkHandler = (agentName: string): ((chunk: any) => void) => {
  return (chunk) => {
    switch (chunk.type) {
      case 'text-start':
        process.stdout.write(`[${agentName}] 📝 Text: `);
        break;
      case 'text-delta':
        process.stdout.write(chunk.payload?.text ?? '');
        break;
      case 'text-end':
        process.stdout.write('\n');
        break;
      case 'reasoning-start':
        process.stdout.write(`[${agentName}] 🧠 Reasoning: `);
        break;
      case 'reasoning-delta':
        process.stdout.write(chunk.payload?.text ?? '');
        break;
      case 'reasoning-end':
        process.stdout.write('\n');
        break;
      case 'error':
        console.error(`[${agentName}] ❌ Error:`, chunk.payload?.error);
        break;
    }
  };
};

// Shared workflow state schema - used to share workflowRunId across all steps
const workflowStateSchema = z.object({
  workflowRunId: z.string(),
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

const vocabularySchema = z.object({
  success: z
    .boolean()
    .describe(
      'Set to true if vocabulary was successfully extracted. Set to false if extraction failed.',
    ),
  explanation: z
    .string()
    .describe(
      'If success is false, explain what went wrong. If true, provide a brief summary of what was extracted.',
    ),
  vocabulary: vocabularyArraySchema
    .nullable()
    .describe('Array of vocabulary entries. Null if success is false.'),
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
  // The current iteration count (for tracking purposes, not passed to agents)
  iterationCount: z.number(),
});

const extractionStep = createStep({
  id: 'extract-structure',
  inputSchema: rawProblemInputSchema,
  outputSchema: structuredProblemSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, mastra, bail, state, setState }) => {
    // Generate and store workflowRunId in shared state
    const workflowRunId = generateWorkflowRunId();
    setState({ ...state, workflowRunId });

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[Structured Problem Extractor] 🚀 Starting extraction...`);
    console.log(`${'='.repeat(60)}`);

    const response = await mastra
      .getAgent('structuredProblemExtractorAgent')
      .generate(`${inputData.rawProblemText}`, {
        structuredOutput: {
          schema: structuredProblemSchema,
        },
        memory: {
          thread: `${workflowRunId}-extractor`,
          resource: 'structuredProblemExtractorAgent', // This resource name allows you to see conversation history in agents tab.
        },
        onChunk: createChunkHandler('Extractor'),
      });

    console.log(`[Structured Problem Extractor] ✅ Extraction complete.`);

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
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, mastra, bail, state }) => {
    const { workflowRunId } = state;
    const {
      structuredProblem,
      rules: previousRules,
      testResults: previousTestResults,
      iterationCount,
    } = inputData;

    console.log(`\n${'='.repeat(60)}`);
    console.log(
      `[Hypothesis-Test Loop] 🔄 Iteration ${iterationCount + 1}/${MAX_HYPOTHESIS_TEST_ITERATIONS}`,
    );
    console.log(`${'='.repeat(60)}`);

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

    console.log(
      `[Rules Hypothesizer] 🚀 Starting ${previousTestResults !== null ? 'revision' : 'hypothesis'}...`,
    );

    const hypothesizerResponse = await mastra
      .getAgent('rulesHypothesizerAgent')
      .generate(hypothesizerPrompt, {
        structuredOutput: {
          schema: rulesSchema,
        },
        memory: {
          thread: `${workflowRunId}-hypothesizer`,
          resource: 'rulesHypothesizerAgent',
        },
        onChunk: createChunkHandler('Hypothesizer'),
      });

    console.log(`[Rules Hypothesizer] ✅ Hypothesis complete.`);

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

    console.log(`[Rules Tester] 🚀 Starting rule validation...`);

    const testerResponse = await mastra.getAgent('rulesTesterAgent').generate(testerPrompt, {
      structuredOutput: {
        schema: rulesTestResultsSchema,
      },
      memory: {
        thread: `${workflowRunId}-tester`,
        resource: 'rulesTesterAgent',
      },
      onChunk: createChunkHandler('Tester'),
    });

    const testerParsed = rulesTestResultsSchema.parse(testerResponse.object);

    console.log(`[Rules Tester] ✅ Validation complete. Result: ${testerParsed.conclusion}`);

    // Return the updated loop state
    return {
      structuredProblem,
      rules: hypothesizerParsed.rules,
      testResults: testerParsed,
      iterationCount: iterationCount + 1,
    };
  },
});

// Schema for the vocabulary extraction step input
const vocabularyExtractionInputSchema = z.object({
  structuredProblem: structuredProblemDataSchema,
  rules: rulesArraySchema,
});

// Schema for the question answering step input (also used as output of vocabulary extraction)
const questionAnsweringInputSchema = z.object({
  structuredProblem: structuredProblemDataSchema,
  rules: rulesArraySchema,
  vocabulary: vocabularyArraySchema,
});

// Step to extract vocabulary from the dataset using validated rules
const extractVocabularyStep = createStep({
  id: 'extract-vocabulary',
  inputSchema: vocabularyExtractionInputSchema,
  outputSchema: questionAnsweringInputSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, mastra, bail, state }) => {
    const { workflowRunId } = state;
    const { structuredProblem, rules } = inputData;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[Vocabulary Extractor] 🚀 Starting vocabulary extraction...`);
    console.log(`${'='.repeat(60)}`);

    const extractorPrompt = JSON.stringify({
      context: structuredProblem.context,
      dataset: structuredProblem.dataset,
      rules: rules,
    });

    const extractorResponse = await mastra
      .getAgent('vocabularyExtractorAgent')
      .generate(extractorPrompt, {
        structuredOutput: {
          schema: vocabularySchema,
        },
        memory: {
          thread: `${workflowRunId}-vocabulary`,
          resource: 'vocabularyExtractorAgent',
        },
        onChunk: createChunkHandler('Vocabulary'),
      });

    console.log(`[Vocabulary Extractor] ✅ Extraction complete.`);

    const extractorParsed = vocabularySchema.parse(extractorResponse.object);

    if (extractorParsed.success === false) {
      return bail({
        success: false,
        message:
          '[Extract Vocabulary Step] Failed to extract vocabulary: ' + extractorParsed.explanation,
      });
    }

    // Pass through the structured problem, rules, and add vocabulary array directly
    return {
      structuredProblem,
      rules,
      vocabulary: extractorParsed.vocabulary!,
    };
  },
});

// Step to answer questions using the validated rules and vocabulary
const answerQuestionsStep = createStep({
  id: 'answer-questions',
  inputSchema: questionAnsweringInputSchema,
  outputSchema: questionsAnsweredSchema,
  stateSchema: workflowStateSchema,
  execute: async ({ inputData, mastra, bail, state }) => {
    const { workflowRunId } = state;
    const { structuredProblem, rules, vocabulary } = inputData;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[Question Answerer] 🚀 Starting to answer questions...`);
    console.log(`${'='.repeat(60)}`);

    const answererPrompt = JSON.stringify({
      context: structuredProblem.context,
      dataset: structuredProblem.dataset,
      questions: structuredProblem.questions,
      rules: rules,
      vocabulary: vocabulary,
    });

    const answererResponse = await mastra
      .getAgent('questionAnswererAgent')
      .generate(answererPrompt, {
        structuredOutput: {
          schema: questionsAnsweredSchema,
        },
        memory: {
          thread: `${workflowRunId}-answerer`,
          resource: 'questionAnswererAgent',
        },
        onChunk: createChunkHandler('Answerer'),
      });

    console.log(`[Question Answerer] ✅ Answering complete.`);

    const answererParsed = questionsAnsweredSchema.parse(answererResponse.object);

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
  id: 'extract-then-hypo-test-loop-workflow',
  inputSchema: rawProblemInputSchema,
  outputSchema: questionsAnsweredSchema,
  stateSchema: workflowStateSchema,
})
  // Step 1: Extract structured problem data.
  .then(extractionStep)
  .map(async ({ inputData }) => ({
    structuredProblem: inputData.data!,
    rules: null,
    testResults: null,
    iterationCount: 0,
  }))
  // Step 2: Up to 5 iterations, perform the hypothesis-test loop:
  // - Hypothesize or revise rules based on previous test results.
  // - Test the hypothesized rules against the dataset.
  .dountil(hypothesisAndTestLoopStep, async ({ inputData }) => {
    // Exit if max iterations reached
    if (inputData.iterationCount >= MAX_HYPOTHESIS_TEST_ITERATIONS) {
      console.warn(
        `[Hypothesis-Test Loop] Max iterations (${MAX_HYPOTHESIS_TEST_ITERATIONS}) reached. Proceeding with current rules.`,
      );
      return true;
    }
    // Exit if all rules are correct
    return inputData.testResults?.conclusion === 'All rules correct';
  })
  .map(async ({ inputData }) => ({
    structuredProblem: inputData.structuredProblem,
    rules: inputData.rules!,
  }))
  // Step 3: Extract vocabulary using the validated rules
  .then(extractVocabularyStep)
  // Step 4: Answer the user's questions using the validated rules and extracted vocabulary.
  .then(answerQuestionsStep)
  .commit();
