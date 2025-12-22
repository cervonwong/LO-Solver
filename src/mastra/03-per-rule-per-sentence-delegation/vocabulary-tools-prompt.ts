/**
 * Shared vocabulary tools instructions for agents that can modify vocabulary.
 * Include this in the instructions of agents that have access to vocabulary tools.
 */
export const VOCABULARY_TOOLS_INSTRUCTIONS = `
# Vocabulary Tools

You have access to tools for managing vocabulary entries. Vocabulary is provided in your prompt from the previous step.

## Available Tools

### getVocabulary
Read all vocabulary entries. **Call this at the end of your task** to verify the vocabulary state after you have made updates.

### addVocabulary
Add NEW vocabulary entries. Only adds entries with foreignForms that do not already exist (duplicates are skipped). Use this when you discover new morphemes during your analysis.

### updateVocabulary
Update EXISTING vocabulary entries by foreignForm key. Overwrites entries that match. Use this to correct or refine vocabulary entries that already exist.

### removeVocabulary
Remove vocabulary entries by foreignForm. Use this to remove incorrect or redundant entries.

### clearVocabulary
Remove ALL vocabulary entries. **Only use this when a complete vocabulary rewrite is needed.** Prefer using getVocabulary → removeVocabulary → addVocabulary for incremental updates.

## Vocabulary Entry Format
Each vocabulary entry should have:
- **foreignForm**: The foreign language morpheme or word (e.g., "kala", "-ti", "na-")
- **meaning**: The English meaning or gloss (e.g., "eat", "past tense", "I/me")
- **type**: The morpheme type (see categories below)
- **notes**: Dataset references, allomorphs, restrictions (e.g., "#1, #3. Suffix only after vowels.")

### Morpheme Types
Use descriptive type names. Common categories: **noun**, **verb-root**, **adjective**, **pronoun**, **tense-marker**, **aspect-marker**, **case-marker**, **number-marker**, **agreement-marker**, **negation-marker**, **question-marker**, **conjunction**, **postposition**. Create other descriptive types as needed (e.g., "evidential-marker", "honorific-marker").

## Vocabulary Guidelines
1. **Be Atomic**: Each entry should represent ONE morpheme with ONE core meaning.
   - BAD: "nakala" = "he eats" (this is a whole word, not a morpheme)
   - GOOD: "na-" = past tense marker, "kala" = eat, "-a" = 3rd person singular

2. **Include All Forms**: If a morpheme has allomorphs, list them all.
   - Example: "-ri / -ni" = "plural" — Notes: -ri after vowels, -ni after consonants

3. **Be Specific About Meaning**: Don't be vague.
   - BAD: "changes the verb"
   - GOOD: "marks past tense"

4. **Cite Evidence**: Reference which dataset items support this entry.

5. **Distinguish Homophones**: If the same form has multiple meanings, create separate entries.

## Important
- **ALWAYS call getVocabulary at the end** of your task to verify the vocabulary state after making updates.
- Use addVocabulary for new discoveries, updateVocabulary to fix existing entries.
`.trim();
