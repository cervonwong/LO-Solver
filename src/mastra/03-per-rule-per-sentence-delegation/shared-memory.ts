import { z } from 'zod';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Vocabulary entry schema for working memory
export const vocabularyEntrySchema = z.object({
  foreignForm: z.string().describe('The foreign language morpheme or word'),
  meaning: z.string().describe('The English meaning or gloss'),
  type: z.string().describe('The morpheme type (e.g., noun, verb-root, tense-marker)'),
  notes: z.string().describe('Additional notes including dataset references, allomorphs, etc.'),
});

// Working memory schema containing vocabulary
export const vocabularyWorkingMemorySchema = z.object({
  vocabulary: z.array(vocabularyEntrySchema).optional(),
});

export type VocabularyEntry = z.infer<typeof vocabularyEntrySchema>;
export type VocabularyWorkingMemory = z.infer<typeof vocabularyWorkingMemorySchema>;

// Shared memory instance with working memory enabled
export const sharedMemory = new Memory({
  storage: new LibSQLStore({
    id: 'workflow03-memory-storage',
    url: 'file:../../mastra.db', // path is relative to the .mastra/output directory
  }),
  options: {
    workingMemory: {
      enabled: true,
      schema: vocabularyWorkingMemorySchema,
    },
  },
});

// Generate unique thread/resource IDs per workflow run
export function generateWorkflowIds(): { threadId: string; resourceId: string } {
  const runId = crypto.randomUUID();
  return {
    threadId: `wf03-thread-${runId}`,
    resourceId: `wf03-resource-${runId}`,
  };
}

// Logging utilities for memory operations
const getLogDirectory = () => process.env.LOG_DIRECTORY || path.join(process.cwd(), 'logs');

export function logMemoryOperation(
  logFile: string,
  operation: 'READ' | 'WRITE' | 'UPDATE' | 'REMOVE',
  details: string,
  vocabularyCount?: number,
): void {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [MEMORY:${operation}] ${details}${vocabularyCount !== undefined ? ` (${vocabularyCount} entries)` : ''}\n`;

  try {
    const logDir = getLogDirectory();
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(logFile, logEntry);
  } catch {
    // Silently fail if logging fails - don't disrupt workflow
  }
}
