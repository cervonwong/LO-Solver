import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { Workflow03RequestContext } from './request-context-types';
import { getVocabularyState, type ToolExecuteContext } from './request-context-helpers';

// Vocabulary entry schema
export const vocabularyEntrySchema = z.object({
  foreignForm: z.string().describe('The foreign language morpheme or word'),
  meaning: z.string().describe('The English meaning or gloss'),
  type: z.string().describe('The morpheme type (e.g., noun, verb-root, tense-marker)'),
  notes: z.string().describe('Additional notes including dataset references, allomorphs, etc.'),
});

export type VocabularyEntry = z.infer<typeof vocabularyEntrySchema>;

/**
 * getVocabulary - Read all vocabulary entries
 * Use this at the end of your task to verify vocabulary state after updates.
 */
export const getVocabulary = createTool({
  id: 'getVocabulary',
  description:
    'Read all vocabulary entries. Use this at the end of your task to verify vocabulary state after you have made updates.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    entries: z.array(vocabularyEntrySchema),
    count: z.number(),
  }),
  execute: async (_inputData, context) => {
    const ctx = context as unknown as ToolExecuteContext;
    const vocabularyState = getVocabularyState(ctx?.requestContext);
    const entries = Array.from(vocabularyState.values());
    console.log(`[VOCAB:READ] Retrieved ${entries.length} vocabulary entries`);
    return {
      entries,
      count: entries.length,
    };
  },
});

/**
 * addVocabulary - Add NEW vocabulary entries
 * Only adds entries with new foreignForms. If a foreignForm already exists, that entry is skipped.
 * Use this when you discover new morphemes during analysis.
 */
export const addVocabulary = createTool({
  id: 'addVocabulary',
  description:
    'Add NEW vocabulary entries. Only adds entries with foreignForms that do not already exist (skips duplicates). Use this when you discover new morphemes during your analysis.',
  inputSchema: z.object({
    entries: z
      .array(vocabularyEntrySchema)
      .describe(
        'Array of new vocabulary entries to add. Entries with existing foreignForms will be skipped.',
      ),
  }),
  outputSchema: z.object({
    added: z.number().describe('Number of entries actually added'),
    skipped: z.number().describe('Number of entries skipped (foreignForm already exists)'),
    total: z.number().describe('Total vocabulary count after operation'),
  }),
  execute: async ({ entries }, context) => {
    const ctx = context as unknown as ToolExecuteContext;
    const vocabularyState = getVocabularyState(ctx?.requestContext);
    let added = 0;
    let skipped = 0;

    for (const entry of entries) {
      if (!vocabularyState.has(entry.foreignForm)) {
        vocabularyState.set(entry.foreignForm, entry);
        added++;
      } else {
        skipped++;
      }
    }

    console.log(`[VOCAB:ADD] Added ${added}, skipped ${skipped}, total ${vocabularyState.size}`);
    return {
      added,
      skipped,
      total: vocabularyState.size,
    };
  },
});

/**
 * updateVocabulary - Update EXISTING vocabulary entries
 * Overwrites entries matching by foreignForm. If a foreignForm does not exist, that entry is skipped.
 * Use this to correct or refine vocabulary entries you've already added.
 */
export const updateVocabulary = createTool({
  id: 'updateVocabulary',
  description:
    'Update EXISTING vocabulary entries by foreignForm key. Overwrites entries that match. Entries with foreignForms that do not exist will be skipped. Use this to correct or refine vocabulary entries you have already added.',
  inputSchema: z.object({
    entries: z
      .array(vocabularyEntrySchema)
      .describe(
        'Array of vocabulary entries to update. Only entries with existing foreignForms will be updated.',
      ),
  }),
  outputSchema: z.object({
    updated: z.number().describe('Number of entries actually updated'),
    skipped: z.number().describe('Number of entries skipped (foreignForm does not exist)'),
    total: z.number().describe('Total vocabulary count after operation'),
  }),
  execute: async ({ entries }, context) => {
    const ctx = context as unknown as ToolExecuteContext;
    const vocabularyState = getVocabularyState(ctx?.requestContext);
    let updated = 0;
    let skipped = 0;

    for (const entry of entries) {
      if (vocabularyState.has(entry.foreignForm)) {
        vocabularyState.set(entry.foreignForm, entry);
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(
      `[VOCAB:UPDATE] Updated ${updated}, skipped ${skipped}, total ${vocabularyState.size}`,
    );
    return {
      updated,
      skipped,
      total: vocabularyState.size,
    };
  },
});

/**
 * removeVocabulary - Remove vocabulary entries by foreignForm
 * Use this to remove incorrect or redundant entries.
 */
export const removeVocabulary = createTool({
  id: 'removeVocabulary',
  description:
    'Remove vocabulary entries by foreignForm. Use this to remove incorrect or redundant entries.',
  inputSchema: z.object({
    foreignForms: z
      .array(z.string())
      .describe('Array of foreignForm keys to remove from vocabulary.'),
  }),
  outputSchema: z.object({
    removed: z.number().describe('Number of entries actually removed'),
    notFound: z.number().describe('Number of foreignForms that were not found'),
    total: z.number().describe('Total vocabulary count after operation'),
  }),
  execute: async ({ foreignForms }, context) => {
    const ctx = context as unknown as ToolExecuteContext;
    const vocabularyState = getVocabularyState(ctx?.requestContext);
    let removed = 0;
    let notFound = 0;

    for (const foreignForm of foreignForms) {
      if (vocabularyState.delete(foreignForm)) {
        removed++;
      } else {
        notFound++;
      }
    }

    console.log(
      `[VOCAB:REMOVE] Removed ${removed}, not found ${notFound}, total ${vocabularyState.size}`,
    );
    return {
      removed,
      notFound,
      total: vocabularyState.size,
    };
  },
});

/**
 * clearVocabulary - Remove all vocabulary entries
 * Only use this when a complete vocabulary rewrite is needed.
 * Prefer getVocabulary → removeVocabulary → addVocabulary for incremental updates.
 */
export const clearVocabulary = createTool({
  id: 'clearVocabulary',
  description:
    'Remove ALL vocabulary entries. Only use this when a complete vocabulary rewrite is needed. Prefer using getVocabulary → removeVocabulary → addVocabulary for incremental updates.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    removed: z.number().describe('Number of entries that were removed'),
  }),
  execute: async (_inputData, context) => {
    const ctx = context as unknown as ToolExecuteContext;
    const vocabularyState = getVocabularyState(ctx?.requestContext);
    const removed = vocabularyState.size;
    vocabularyState.clear();
    console.log(`[VOCAB:CLEAR] Cleared ${removed} vocabulary entries`);
    return { removed };
  },
});

/**
 * Static vocabulary tools object for use by agents.
 * All tools read vocabulary state from requestContext.
 */
export const vocabularyTools = {
  getVocabulary,
  addVocabulary,
  updateVocabulary,
  removeVocabulary,
  clearVocabulary,
};

export type VocabularyTools = typeof vocabularyTools;
