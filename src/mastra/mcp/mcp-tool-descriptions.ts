/**
 * Optimized tool descriptions for Claude's tool-use format.
 * Concise, states when to use and when not to, describes input/output behavior.
 */
export const MCP_TOOL_DESCRIPTIONS = {
  getVocabulary:
    'Read all vocabulary entries from the shared store. Returns {entries, count}. Use after making updates to verify state.',
  addVocabulary:
    'Add new vocabulary entries. Entries with foreignForms that already exist are skipped. Returns {added, skipped, total}.',
  updateVocabulary:
    'Update existing vocabulary entries by foreignForm key. Entries with non-existent foreignForms are skipped. Returns {updated, skipped, total}.',
  removeVocabulary:
    'Remove vocabulary entries by foreignForm. Returns {removed, notFound, total}.',
  clearVocabulary:
    'Remove ALL vocabulary entries. Only use for complete rewrites. Returns {removed}.',
  getRules:
    'Read all linguistic rules from the shared store. Returns {rules, count}. Use after updates to verify state.',
  addRules:
    'Add new linguistic rules. Rules with titles that already exist are skipped. Returns {added, skipped, total}.',
  updateRules:
    'Update existing rules by title key. Rules with non-existent titles are skipped. Returns {updated, skipped, total}.',
  removeRules: 'Remove rules by title. Returns {removed, notFound, total}.',
  clearRules: 'Remove ALL rules. Only use for complete rewrites. Returns {removed}.',
  testRule:
    'Test a single rule against the dataset using committed rules from the store. Provide the rule\'s title and description. Spawns a sub-agent. Returns {success, passed, reasoning}.',
  testRuleWithRuleset:
    'Test a single rule against the dataset using a provided draft ruleset. Pass the rule to test plus your entire proposed ruleset for context. Returns {success, passed, reasoning}.',
  testSentence:
    'Test a sentence translation using committed rules from the store. Spawns a sub-agent for blind translation. Returns {success, passed, translation, reasoning, matchesExpected}.',
  testSentenceWithRuleset:
    'Test a sentence translation using a provided draft ruleset. Pass sentence details plus your entire proposed ruleset. Returns {success, passed, translation, reasoning, matchesExpected}.',
};
