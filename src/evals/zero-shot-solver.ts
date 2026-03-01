import { Agent } from '@mastra/core/agent';
import { RequestContext } from '@mastra/core/request-context';
import { z } from 'zod';

import { openrouter, TESTING_MODEL, type ModelMode } from '@/mastra/openrouter';
import { questionsAnsweredSchema } from '@/mastra/workflow/workflow-schemas';

type QuestionsAnswered = z.infer<typeof questionsAnsweredSchema>;

const ZERO_SHOT_INSTRUCTIONS = `You are a linguistics expert solving a Rosetta Stone problem.
You will be given a problem with example sentences in a foreign language and their translations.
Analyze the patterns carefully, then translate/answer all the questions.

Return your response as JSON in this exact format:
{
  "success": true,
  "explanation": "Brief summary of your analysis",
  "answers": [
    {
      "questionId": "Q1",
      "answer": "the translated text",
      "workingSteps": "step-by-step reasoning",
      "confidence": "HIGH",
      "confidenceReasoning": "why this confidence level"
    }
  ]
}

If you cannot solve the problem, return:
{ "success": false, "explanation": "reason", "answers": null }`;

const zeroShotAgent = new Agent({
  id: 'zero-shot-solver',
  name: '[Eval] Zero-Shot Solver Agent',
  instructions: ZERO_SHOT_INSTRUCTIONS,
  model: ({ requestContext }) =>
    openrouter(
      requestContext?.get('model-mode') === 'production'
        ? 'google/gemini-3-flash-preview'
        : TESTING_MODEL,
    ),
  tools: {},
});

/**
 * Solve a linguistics problem using a single zero-shot LLM call (no multi-step workflow).
 * Returns output shaped as questionsAnsweredSchema for compatibility with the translation scorer.
 */
export async function solveZeroShot(
  rawProblemText: string,
  modelMode: ModelMode,
): Promise<QuestionsAnswered> {
  try {
    const requestContext = new RequestContext<{ 'model-mode': ModelMode }>();
    requestContext.set('model-mode', modelMode);

    const result = await zeroShotAgent.generate(rawProblemText, {
      requestContext,
      structuredOutput: {
        schema: questionsAnsweredSchema,
      },
      modelSettings: {
        maxOutputTokens: 16384,
        temperature: 0,
      },
    });

    return result.object as QuestionsAnswered;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, explanation: message, answers: null };
  }
}
