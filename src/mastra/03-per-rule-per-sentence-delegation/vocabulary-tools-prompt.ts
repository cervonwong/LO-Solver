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
Remove ALL vocabulary entries. Use this when you need to start fresh with the vocabulary.

## Vocabulary Entry Format
Each vocabulary entry should have:
- **foreignForm**: The foreign language morpheme or word (e.g., "kala", "-ti", "na-")
- **meaning**: The English meaning or gloss (e.g., "eat", "past tense", "I/me")
- **type**: The morpheme type (see categories below)
- **notes**: Dataset references, allomorphs, restrictions (e.g., "#1, #3. Suffix only after vowels.")

### Morpheme Types
Use these categories (or create descriptive ones if needed):
- **noun**: Noun roots (e.g., "house", "dog", "man")
- **verb-root**: Verb stems without inflection (e.g., "eat", "see", "go")
- **adjective**: Adjective roots (e.g., "big", "red", "good")
- **pronoun**: Personal pronouns (e.g., "I", "you", "he/she")
- **demonstrative**: Demonstrative words (e.g., "this", "that")
- **number-marker**: Singular/plural markers
- **tense-marker**: Past/present/future markers
- **aspect-marker**: Perfective/imperfective markers
- **case-marker**: Nominative/accusative/genitive markers
- **agreement-marker**: Subject/object agreement affixes
- **possessive-marker**: Possession indicators
- **negation-marker**: Negation affixes or particles
- **question-marker**: Interrogative markers
- **conjunction**: Words like "and", "or", "but"
- **preposition/postposition**: Spatial/temporal relation markers
- **copula**: Linking verbs ("to be")
- **classifier**: Numeral classifiers
- **focus-particle**: Focus or topic markers
- **evidential-marker**: Source of information markers
- **honorific-marker**: Politeness/respect markers

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
