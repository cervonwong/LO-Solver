import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { ruleSchema } from './workflow-schemas';
import type { Rule } from './workflow-schemas';
import { getRulesState, emitToolTraceEvent, type ToolExecuteContext } from './request-context-helpers';

export { ruleSchema } from './workflow-schemas';
export type RuleEntry = Rule;

/**
 * getRules - Read all rules from the rules store
 * Use this at the end of your task to verify rules state after updates.
 */
export const getRules = createTool({
  id: 'getRules',
  description:
    'Read all rules. Use this at the end of your task to verify rules state after you have made updates.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    rules: z.array(ruleSchema),
    count: z.number(),
  }),
  execute: async (_inputData, context) => {
    const ctx = context as unknown as ToolExecuteContext;
    const rulesState = getRulesState(ctx?.requestContext);
    const rules = Array.from(rulesState.values());
    console.log(`[RULES:READ] Retrieved ${rules.length} rules`);
    return {
      rules,
      count: rules.length,
    };
  },
});

/**
 * addRules - Add NEW rules
 * Only adds rules with new titles. If a title already exists, that rule is skipped.
 * Use this when you discover new linguistic rules during analysis.
 */
export const addRules = createTool({
  id: 'addRules',
  description:
    'Add NEW rules. Only adds rules with titles that do not already exist (skips duplicates). Use this when you discover new linguistic rules during your analysis.',
  inputSchema: z.object({
    entries: z
      .array(ruleSchema)
      .describe('Array of new rules to add. Rules with existing titles will be skipped.'),
  }),
  outputSchema: z.object({
    added: z.number().describe('Number of rules actually added'),
    skipped: z.number().describe('Number of rules skipped (title already exists)'),
    total: z.number().describe('Total rules count after operation'),
  }),
  execute: async ({ entries }, context) => {
    const ctx = context as unknown as ToolExecuteContext;
    const rulesState = getRulesState(ctx?.requestContext);
    let added = 0;
    let skipped = 0;
    const addedEntries: Rule[] = [];

    for (const entry of entries) {
      if (!rulesState.has(entry.title)) {
        rulesState.set(entry.title, entry);
        addedEntries.push(entry);
        added++;
      } else {
        skipped++;
      }
    }

    console.log(`[RULES:ADD] Added ${added}, skipped ${skipped}, total ${rulesState.size}`);

    await emitToolTraceEvent(ctx?.requestContext, {
      type: 'data-rules-update',
      data: {
        action: 'add',
        entries: addedEntries,
        totalCount: rulesState.size,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      added,
      skipped,
      total: rulesState.size,
    };
  },
});

/**
 * updateRules - Update EXISTING rules
 * Overwrites rules matching by title. If a title does not exist, that rule is skipped.
 * Use this to correct or refine rules you've already added.
 */
export const updateRules = createTool({
  id: 'updateRules',
  description:
    'Update EXISTING rules by title key. Overwrites rules that match. Rules with titles that do not exist will be skipped. Use this to correct or refine rules you have already added.',
  inputSchema: z.object({
    entries: z
      .array(ruleSchema)
      .describe('Array of rules to update. Only rules with existing titles will be updated.'),
  }),
  outputSchema: z.object({
    updated: z.number().describe('Number of rules actually updated'),
    skipped: z.number().describe('Number of rules skipped (title does not exist)'),
    total: z.number().describe('Total rules count after operation'),
  }),
  execute: async ({ entries }, context) => {
    const ctx = context as unknown as ToolExecuteContext;
    const rulesState = getRulesState(ctx?.requestContext);
    let updated = 0;
    let skipped = 0;
    const updatedEntries: Rule[] = [];

    for (const entry of entries) {
      if (rulesState.has(entry.title)) {
        rulesState.set(entry.title, entry);
        updatedEntries.push(entry);
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`[RULES:UPDATE] Updated ${updated}, skipped ${skipped}, total ${rulesState.size}`);

    await emitToolTraceEvent(ctx?.requestContext, {
      type: 'data-rules-update',
      data: {
        action: 'update',
        entries: updatedEntries,
        totalCount: rulesState.size,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      updated,
      skipped,
      total: rulesState.size,
    };
  },
});

/**
 * removeRules - Remove rules by title
 * Use this to remove incorrect or redundant rules.
 */
export const removeRules = createTool({
  id: 'removeRules',
  description: 'Remove rules by title. Use this to remove incorrect or redundant rules.',
  inputSchema: z.object({
    titles: z.array(z.string()).describe('Array of rule titles to remove.'),
  }),
  outputSchema: z.object({
    removed: z.number().describe('Number of rules actually removed'),
    notFound: z.number().describe('Number of titles that were not found'),
    total: z.number().describe('Total rules count after operation'),
  }),
  execute: async ({ titles }, context) => {
    const ctx = context as unknown as ToolExecuteContext;
    const rulesState = getRulesState(ctx?.requestContext);
    let removed = 0;
    let notFound = 0;
    const removedTitles: string[] = [];

    for (const title of titles) {
      if (rulesState.delete(title)) {
        removedTitles.push(title);
        removed++;
      } else {
        notFound++;
      }
    }

    console.log(
      `[RULES:REMOVE] Removed ${removed}, not found ${notFound}, total ${rulesState.size}`,
    );

    await emitToolTraceEvent(ctx?.requestContext, {
      type: 'data-rules-update',
      data: {
        action: 'remove',
        entries: removedTitles.map((t) => ({ title: t, description: '' })),
        totalCount: rulesState.size,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      removed,
      notFound,
      total: rulesState.size,
    };
  },
});

/**
 * clearRules - Remove all rules
 * Only use this when a complete rules rewrite is needed.
 * Prefer getRules -> removeRules -> addRules for incremental updates.
 */
export const clearRules = createTool({
  id: 'clearRules',
  description:
    'Remove ALL rules. Only use this when a complete rules rewrite is needed. Prefer using getRules -> removeRules -> addRules for incremental updates.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    removed: z.number().describe('Number of rules that were removed'),
  }),
  execute: async (_inputData, context) => {
    const ctx = context as unknown as ToolExecuteContext;
    const rulesState = getRulesState(ctx?.requestContext);
    const removed = rulesState.size;
    rulesState.clear();
    console.log(`[RULES:CLEAR] Cleared ${removed} rules`);

    await emitToolTraceEvent(ctx?.requestContext, {
      type: 'data-rules-update',
      data: {
        action: 'clear',
        entries: [],
        totalCount: 0,
        timestamp: new Date().toISOString(),
      },
    });

    return { removed };
  },
});

/**
 * Static rules tools object for use by agents.
 * All tools read rules state from requestContext.
 */
export const rulesTools = {
  getRules,
  addRules,
  updateRules,
  removeRules,
  clearRules,
};

export type RulesTools = typeof rulesTools;
