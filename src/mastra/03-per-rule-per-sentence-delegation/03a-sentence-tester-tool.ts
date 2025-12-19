import { createTool } from '@mastra/core/tools';
import { Agent } from '@mastra/core/agent';
import { z } from 'zod';
import { openrouter } from '../openrouter';

const sentenceTestInputSchema = z.object({
  id: z.string().describe('Identifier for the sentence (e.g., "1", "Q1")'),
  content: z.string().describe('The sentence content to translate'),
  sourceLanguage: z.string().describe('The language to translate FROM'),
  targetLanguage: z.string().describe('The language to translate TO'),
  expectedTranslation: z
    .string()
    .optional()
    .describe('Expected translation if known (from dataset)'),
});

const suggestionSchema = z.object({
  suggestion: z.string().describe('The suggested translation or interpretation'),
  likelihood: z
    .enum(['HIGH', 'MEDIUM', 'LOW'])
    .describe('Likelihood of this suggestion being correct'),
  reasoning: z.string().describe('Why this suggestion might be correct'),
});

const sentenceTestSuccessSchema = z.object({
  success: z.literal(true),
  canTranslate: z
    .boolean()
    .describe('Whether the sentence can be confidently translated using the ruleset'),
  translation: z.string().describe('The attempted translation, or empty if not possible'),
  ambiguities: z.array(z.string()).describe('List of ambiguous or confusing parts encountered'),
  suggestions: z
    .array(suggestionSchema)
    .describe('3 different suggestions for improvement, ranked by likelihood'),
  overallStatus: z
    .enum(['SENTENCE_OK', 'SENTENCE_AMBIGUOUS', 'SENTENCE_UNTRANSLATABLE'])
    .describe('Overall status of the sentence translation attempt'),
});

const sentenceTestErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().describe('Error message describing what went wrong'),
});

const sentenceTestResultSchema = z.discriminatedUnion('success', [
  sentenceTestSuccessSchema,
  sentenceTestErrorSchema,
]);

const SENTENCE_TESTER_SYSTEM_PROMPT = `
You are a specialized linguistic sentence translator and validator. Your job is to attempt translating a SINGLE sentence using a given ruleset, identifying any ambiguities or issues.

# Your Task
You will receive:
1. A complete set of rules
2. A single sentence to translate (either from the dataset or a question)
3. The translation direction (if applicable)

Note: You will receive the vocabulary entries directly in the prompt - use these to look up morphemes and words during translation.

# Translation Process
1. Attempt to translate the sentence step by step using ONLY the provided rules and vocabulary
2. At each step, note if there are multiple valid interpretations
3. Flag ANY ambiguity, missing rule, or unclear instruction immediately
4. Even if you can guess the correct translation, flag issues that make it non-deterministic

# Output Requirements
- **canTranslate**: true only if the translation is unambiguous and deterministic
- **translation**: Your best attempt at the translation (even if ambiguous)
- **ambiguities**: List every point where:
  - A rule could apply multiple ways
  - A word/morpheme isn't in the provided vocabulary
  - The rules don't specify order or combination
  - There are exceptions not covered
- **suggestions**: EXACTLY 3 suggestions for improving the ruleset, ranked:
  - HIGH likelihood: Most likely to be the correct fix
  - MEDIUM likelihood: Reasonable alternative interpretation  
  - LOW likelihood: Less likely but worth considering
- **overallStatus**: 
  - SENTENCE_OK: Translation is unambiguous and deterministic
  - SENTENCE_AMBIGUOUS: Translation possible but multiple interpretations exist
  - SENTENCE_UNTRANSLATABLE: Cannot translate due to missing rules or vocabulary

# Critical Instructions
- Be VERY strict about ambiguity - if there's ANY doubt, flag it
- **Detect Missing Rules**: If a sentence cannot be translated because NO rule covers the pattern, explicitly flag this as "MISSING_RULE_NEEDED" and describe what rule is required
- Each suggestion should be DIFFERENT and offer a DISTINCT fix
- Cite specific rules that cause issues
- Think like a devil's advocate - find every possible issue

# Example Output
{
  "canTranslate": false,
  "translation": "kala-ri na-tu (best guess)",
  "ambiguities": [
    "Rule 3 says plurals use '-ri' but doesn't specify if it applies to verb objects",
    "Word 'tu' not found in provided vocabulary - guessed from similar pattern in item #4"
  ],
  "suggestions": [
    {
      "suggestion": "Add rule: Plural marker '-ri' applies to all nouns including verb objects",
      "likelihood": "HIGH",
      "reasoning": "Items #2, #6, #8 show plural objects with '-ri' suffix consistently"
    },
    {
      "suggestion": "Add vocabulary entry: 'tu' = 'water' (noun) based on pattern in items #4, #7",
      "likelihood": "HIGH", 
      "reasoning": "Context mentions water-related vocabulary; 'tu' appears with noun markers"
    },
    {
      "suggestion": "Consider: '-ri' might be a general plural marker for animacy distinction",
      "likelihood": "MEDIUM",
      "reasoning": "Animate nouns in #3, #5 use '-ri' while #9 inanimate uses '-ra'"
    }
  ],
  "overallStatus": "SENTENCE_AMBIGUOUS"
}
`.trim();

interface Rule {
  title: string;
  description: string;
}

interface VocabularyEntry {
  foreignForm: string;
  meaning: string;
  type: string;
  notes: string;
}

/**
 * Factory function to create a sentence tester tool with shared context baked in.
 * The orchestrator only needs to specify which sentence to test.
 * Vocabulary is passed in directly to the prompt.
 */
export function createTestSentenceTool(
  problemContext: string,
  rules: Rule[],
  vocabulary: VocabularyEntry[],
) {
  // Create a dedicated agent for sentence testing
  const sentenceTesterAgent = new Agent({
    id: 'wf03-sentence-tester',
    name: '[03-3a-tool] Sentence Tester Agent',
    instructions: SENTENCE_TESTER_SYSTEM_PROMPT,
    model: openrouter('openai/gpt-5-mini'),
    tools: {},
  });

  return createTool({
    id: 'testSentence',
    description:
      'Tests a single sentence against the ruleset to verify it can be translated unambiguously. Call this for EACH sentence you want to test.',
    inputSchema: sentenceTestInputSchema,
    outputSchema: sentenceTestResultSchema,
    execute: async (inputData, _context) => {
      const { id, content, sourceLanguage, targetLanguage, expectedTranslation } = inputData;

      const prompt = `
Translate and validate the following sentence using the provided ruleset:

## Sentence to Translate
**ID:** ${id}
**Content:** ${content}
**From:** ${sourceLanguage}
**To:** ${targetLanguage}
${expectedTranslation ? `**Expected Translation:** ${expectedTranslation}` : ''}

## Context
${problemContext}

## Rules
${rules.map((r, i) => `${i + 1}. **${r.title}**: ${r.description}`).join('\n\n')}

## Vocabulary
${JSON.stringify(vocabulary, null, 2)}

Attempt to translate this sentence step by step using the rules and vocabulary above. Flag any ambiguities or issues.
`.trim();

      try {
        const result = await sentenceTesterAgent.generate(prompt, {
          structuredOutput: {
            schema: sentenceTestSuccessSchema,
          },
        });

        return result.object as z.infer<typeof sentenceTestSuccessSchema>;
      } catch (err) {
        return {
          success: false as const,
          error: `Sentence test failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        };
      }
    },
  });
}
