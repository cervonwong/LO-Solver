/**
 * Logging utilities for Workflow 03.
 * Centralizes all file-based logging operations.
 */
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

// Step timing type (matches workflow state)
export interface StepTiming {
  stepName: string;
  agentName: string;
  endTime: string; // HH:MM:SS in GMT+8
  durationMinutes: number;
}

// Get log directory from environment or default
export const getLogDirectory = (): string =>
  process.env.LOG_DIRECTORY || path.join(process.cwd(), 'logs');

// Generate timestamped log file path
export const getLogFilePath = (): string => {
  const now = new Date();
  const gmt8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const year = gmt8.getUTCFullYear();
  const month = String(gmt8.getUTCMonth() + 1).padStart(2, '0');
  const day = String(gmt8.getUTCDate()).padStart(2, '0');
  const hours = String(gmt8.getUTCHours()).padStart(2, '0');
  const minutes = String(gmt8.getUTCMinutes()).padStart(2, '0');
  const seconds = String(gmt8.getUTCSeconds()).padStart(2, '0');
  const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  return path.join(getLogDirectory(), `workflow-03_${timestamp}.md`);
};

// Format time in GMT+8
export const formatTimeGMT8 = (date: Date): string => {
  const gmt8 = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const hours = String(gmt8.getUTCHours()).padStart(2, '0');
  const minutes = String(gmt8.getUTCMinutes()).padStart(2, '0');
  const seconds = String(gmt8.getUTCSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

// Record step timing
export const recordStepTiming = (
  stepName: string,
  agentName: string,
  startTime: Date,
): StepTiming => {
  const endTime = new Date();
  const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
  return {
    stepName,
    agentName,
    endTime: formatTimeGMT8(endTime),
    durationMinutes: Math.round(durationMinutes * 100) / 100,
  };
};

// Initialize log file
export const initializeLogFile = (logFile: string, startTime: string): void => {
  const logDir = getLogDirectory();
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  fs.writeFileSync(logFile, `# Workflow Execution Log\n\n_Generated: ${startTime}_\n\n---\n\n`);
};

// Log workflow summary
export const logWorkflowSummary = (
  logFile: string,
  startTimeIso: string,
  stepTimings: StepTiming[],
): void => {
  const startTime = new Date(startTimeIso);
  const endTime = new Date();
  const totalDurationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;

  let content = `## Workflow Timing Summary\n\n`;
  content += `**Start Time:** ${formatTimeGMT8(startTime)}\n`;
  content += `**End Time:** ${formatTimeGMT8(endTime)}\n`;
  content += `**Total Duration:** ${Math.round(totalDurationMinutes * 100) / 100} minutes\n\n`;
  content += `### Step Timings\n\n`;
  content += `| Step | Agent | Finished At | Duration (min) |\n`;
  content += `|------|-------|-------------|----------------|\n`;

  for (const timing of stepTimings) {
    content += `| ${timing.stepName} | ${timing.agentName} | ${timing.endTime} | ${timing.durationMinutes} |\n`;
  }

  content += `\n---\n`;
  fs.appendFileSync(logFile, content);
};

// Format reasoning for logging
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const formatReasoning = (reasoning: any): string | null => {
  if (!reasoning) return null;
  if (typeof reasoning === 'string') return reasoning;
  if (!Array.isArray(reasoning)) return null;

  const result = reasoning
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((chunk: any) => chunk.payload?.text || chunk.text || '')
    .filter((text: string) => text && text !== '[REDACTED]')
    .join('');

  return result || null;
};

// Log agent output
export const logAgentOutput = (
  logFile: string,
  stepName: string,
  agentName: string,
  output: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reasoning?: any,
): void => {
  let content = `## ${stepName}\n\n**Agent:** ${agentName}\n\n`;

  const formattedReasoning = formatReasoning(reasoning);
  if (formattedReasoning) {
    content += `### Reasoning\n\n${formattedReasoning}\n\n`;
  } else {
    content += `### Reasoning\n\n(Reasoning not provided.)\n\n`;
  }

  content += `### Output\n\n\`\`\`json\n${JSON.stringify(output, null, 2)}\n\`\`\`\n\n---\n\n`;
  fs.appendFileSync(logFile, content);
};

// Log validation error
export const logValidationError = (logFile: string, stepName: string, error: z.ZodError): void => {
  const content = `## ⚠️ Validation Error: ${stepName}\n\n\`\`\`\n${error.message}\n\`\`\`\n\n**Issues:**\n${error.issues.map((issue) => `- **${issue.path.join('.')}**: ${issue.message}`).join('\n')}\n\n---\n\n`;
  fs.appendFileSync(logFile, content);
};

// Vocabulary logging

/** Log vocabulary entries added (meaning → foreignForm) */
export const logVocabularyAdded = (
  logFile: string | undefined,
  entries: { meaning: string; foreignForm: string }[],
): void => {
  if (!logFile || entries.length === 0) return;
  const mappings = entries.map((e) => `  ${e.meaning} → ${e.foreignForm}`).join('\n');
  fs.appendFileSync(logFile, `### Vocabulary Added (${entries.length} entries)\n\n${mappings}\n\n`);
};

/** Log vocabulary entries updated (meaning → foreignForm) */
export const logVocabularyUpdated = (
  logFile: string | undefined,
  entries: { meaning: string; foreignForm: string }[],
): void => {
  if (!logFile || entries.length === 0) return;
  const mappings = entries.map((e) => `  ${e.meaning} → ${e.foreignForm}`).join('\n');
  fs.appendFileSync(
    logFile,
    `### Vocabulary Updated (${entries.length} entries)\n\n${mappings}\n\n`,
  );
};

/** Log vocabulary entries removed (foreignForm list) */
export const logVocabularyRemoved = (logFile: string | undefined, foreignForms: string[]): void => {
  if (!logFile || foreignForms.length === 0) return;
  const list = foreignForms.map((f) => `  - ${f}`).join('\n');
  fs.appendFileSync(
    logFile,
    `### Vocabulary Removed (${foreignForms.length} entries)\n\n${list}\n\n`,
  );
};

/** Log vocabulary cleared */
export const logVocabularyCleared = (logFile: string | undefined, count: number): void => {
  if (!logFile || count === 0) return;
  fs.appendFileSync(logFile, `### Vocabulary Cleared (${count} entries)\n\n`);
};

// Tester logging

/** Log sentence test result (ID + status) */
export const logSentenceTestResult = (
  logFile: string | undefined,
  id: string,
  status: string,
): void => {
  if (!logFile) return;
  fs.appendFileSync(logFile, `[SENTENCE] #${id}: ${status}\n`);
};

/** Log rule test result (title + status) */
export const logRuleTestResult = (
  logFile: string | undefined,
  title: string,
  status: string,
): void => {
  if (!logFile) return;
  fs.appendFileSync(logFile, `[RULE] "${title}": ${status}\n`);
};
