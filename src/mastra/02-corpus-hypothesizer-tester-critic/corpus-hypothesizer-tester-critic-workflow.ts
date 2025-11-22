import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const structuredProblemSchema = z.object({
  success: z
    .boolean()
    .describe(
      'Set to true if a dataset and questions were found. Set to false if they are missing.',
    ),
  explanation: z
    .string()
    .describe('If success is false, explain what is missing. If true, provide a brief summary.'),
  data: z
    .object({
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
            type: z
              .string()
              .describe("Task type (e.g. 'translate-to-english', 'translate-to-target')"),
            input: z.string().describe('The input phrase or sentence to be processed'),
          }),
        )
        .describe('Specific questions the user needs to answer'),
    })
    .nullable()
    .describe('The extracted problem data. Null if success is false.'),
});

const extractionStep = createStep({
  id: 'extract-structure',
  inputSchema: z.object({
    rawProblemText: z.string(),
  }),
  outputSchema: structuredProblemSchema,
  execute: async ({ inputData, mastra, bail }) => {
    const response = await mastra
      .getAgent('structuredProblemExtractorAgent')
      .generate(`${inputData.rawProblemText}`, {
        structuredOutput: {
          schema: structuredProblemSchema,
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

const corpusHypothesizerTesterCriticWorkflow = createWorkflow({
  id: 'corpus-hypothesizer-tester-critic-workflow',
  inputSchema: z.object({
    rawProblemText: z.string(),
  }),
  outputSchema: structuredProblemSchema,
})
  .then(extractionStep)
  .commit();

export { corpusHypothesizerTesterCriticWorkflow };
