/**
 * Shared rules tools instructions for agents that can modify rules.
 * Include this in the instructions of agents that have access to rules tools.
 */
export const RULES_TOOLS_INSTRUCTIONS = `
# Rules Tools

You have access to tools for managing linguistic rules. Rules describe patterns, mechanisms, and grammar structures discovered in the data.

## Available Tools

### getRules
Read all rules. **Call this at the end of your task** to verify the rules state after you have made updates.

### addRules
Add NEW rules. Only adds rules with titles that do not already exist (duplicates are skipped). Use this when you discover new linguistic patterns during your analysis.

### updateRules
Update EXISTING rules by title key. Overwrites rules that match. Use this to correct or refine rules that already exist.

### removeRules
Remove rules by title. Use this to remove incorrect or redundant rules.

### clearRules
Remove ALL rules. **Only use this when a complete rules rewrite is needed.** Prefer using getRules -> removeRules -> addRules for incremental updates.

## Rule Entry Format
Each rule should have:
- **title**: A short title that groups or organises the rule (e.g., "Sentence syntax", "Verb agreement", "Noun cases")
- **description**: A detailed description of the rule, such as grammar patterns or phonetic changes
- **confidence**: Confidence level for this rule based on evidence strength (HIGH, MEDIUM, or LOW)

## Rules Guidelines
1. **Rules describe patterns and mechanisms**, not vocabulary items. Vocabulary (morphemes, words, glosses) belongs in vocabulary tools.
   - RULE: "Verb roots take a tense suffix before the person agreement suffix"
   - NOT A RULE: "kala means eat" (this is a vocabulary entry)

2. **Be specific and testable**: Rules should be precise enough that they can be verified against the dataset.
   - BAD: "Verbs change form"
   - GOOD: "Transitive verbs take the prefix na- in past tense when the subject is first person"

3. **Cite evidence**: Reference which dataset items support this rule (e.g., "Supported by #1, #3, #7").

4. **Set confidence accurately**:
   - HIGH: Consistent across multiple examples, no counter-examples
   - MEDIUM: Supported by some examples, minor exceptions possible
   - LOW: Based on limited data or has known exceptions

5. **Group related patterns**: Use the title to group related rules (e.g., all verb agreement rules share the title "Verb agreement").

## Important
- **ALWAYS call getRules at the end** of your task to verify the rules state after making updates.
- Use addRules for new discoveries, updateRules to fix existing rules.
- Rules and vocabulary are complementary: rules describe HOW the language works, vocabulary describes WHAT the morphemes mean.
`.trim();
