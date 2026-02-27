import { z } from 'zod';
import { vocabularyEntrySchema } from './vocabulary-tools';
import { getLogFilePath, initializeLogFile } from './logging-utils';

export const MAX_VERIFY_IMPROVE_ITERATIONS = 4;

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
  modelMode: z.enum(['testing', 'production']).default('testing'),
});

export type WorkflowState = z.infer<typeof workflowStateSchema>;

// Initialize workflow state - returns initial state object
export const initializeWorkflowState = (): WorkflowState => {
  const logFile = getLogFilePath();
  const startTime = new Date().toISOString();
  initializeLogFile(logFile, startTime);

  return {
    vocabulary: {},
    logFile,
    startTime,
    stepTimings: [],
    modelMode: 'testing' as const,
  };
};

export const rawProblemInputSchema = z.object({
  rawProblemText: z.string(),
  modelMode: z.enum(['testing', 'production']).default('testing'),
});

export const structuredProblemDataSchema = z.object({
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

export const structuredProblemSchema = z.object({
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

export const rulesSchema = z.object({
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

export const verifierFeedbackSchema = z.object({
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

export const questionsAnsweredSchema = z.object({
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
export const hypothesisTestLoopSchema = z.object({
  // The original structured problem data (immutable through the loop)
  structuredProblem: structuredProblemDataSchema,
  // The current hypothesized rules (null on first iteration, updated each iteration)
  rules: rulesArraySchema.nullable(),
  // The test results from the previous iteration (null on first iteration, updated each iteration)
  testResults: verifierFeedbackSchema.nullable(),
  // The current iteration count (for tracking purposes, not passed to agents)
  iterationCount: z.number(),
});

// Schema for initial hypothesis step input
export const initialHypothesisInputSchema = structuredProblemDataSchema;

// Schema for initial hypothesis step output (includes rules, vocabulary, and loop state)
export const initialHypothesisOutputSchema = hypothesisTestLoopSchema;

// Schema for the question answering step input
// Vocabulary is read from workflow state, not passed in this schema
export const questionAnsweringInputSchema = z.object({
  structuredProblem: structuredProblemDataSchema,
  rules: rulesArraySchema,
});
