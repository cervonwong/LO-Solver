/**
 * Logging utilities for the solver workflow.
 * Centralizes all file-based logging operations.
 */
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

// Step timing type (matches workflow state)
interface StepTiming {
  stepName: string;
  agentName: string;
  endTime: string; // HH:MM:SS in GMT+8
  durationMinutes: number;
}

// Get log directory from environment or default
const getLogDirectory = (): string =>
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
  return path.join(getLogDirectory(), `workflow_${timestamp}.md`);
};

// Format time in GMT+8
const formatTimeGMT8 = (date: Date): string => {
  const gmt8 = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const hours = String(gmt8.getUTCHours()).padStart(2, '0');
  const minutes = String(gmt8.getUTCMinutes()).padStart(2, '0');
  const seconds = String(gmt8.getUTCSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Format a timestamp prefix for log lines: [HH:MM:SS +N.Ns]
 * Uses GMT+8 wall clock and elapsed seconds since workflow start.
 * If startTime is undefined, returns wall-clock only: [HH:MM:SS]
 */
export const formatTimestamp = (startTime?: number): string => {
  const now = Date.now();
  const wallClock = formatTimeGMT8(new Date(now));
  if (startTime === undefined) {
    return `[${wallClock}]`;
  }
  const elapsedSec = ((now - startTime) / 1000).toFixed(1);
  return `[${wallClock} +${elapsedSec}s]`;
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

/** Shape of a single reasoning chunk returned by LLM providers. */
interface ReasoningChunk {
  payload?: { text?: string };
  text?: string;
}

// Format reasoning for logging
const formatReasoning = (
  reasoning: string | ReasoningChunk[] | null | undefined,
): string | null => {
  if (!reasoning) return null;
  if (typeof reasoning === 'string') return reasoning;
  if (!Array.isArray(reasoning)) return null;

  const result = reasoning
    .map((chunk: ReasoningChunk) => chunk.payload?.text || chunk.text || '')
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
  reasoning?: string | ReasoningChunk[] | null,
  startTime?: number,
): void => {
  let content = `${formatTimestamp(startTime)} ## ${stepName}\n\n**Agent:** ${agentName}\n\n`;

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
export const logValidationError = (
  logFile: string,
  stepName: string,
  error: z.ZodError,
  startTime?: number,
): void => {
  const content = `${formatTimestamp(startTime)} ## ⚠️ Validation Error: ${stepName}\n\n\`\`\`\n${error.message}\n\`\`\`\n\n**Issues:**\n${error.issues.map((issue) => `- **${issue.path.join('.')}**: ${issue.message}`).join('\n')}\n\n---\n\n`;
  fs.appendFileSync(logFile, content);
};

// Vocabulary logging

/** Log vocabulary entries added (meaning → foreignForm) */
export const logVocabularyAdded = (
  logFile: string | undefined,
  entries: { meaning: string; foreignForm: string }[],
  startTime?: number,
): void => {
  if (!logFile || entries.length === 0) return;
  const mappings = entries.map((e) => `  ${e.meaning} → ${e.foreignForm}`).join('\n');
  fs.appendFileSync(
    logFile,
    `${formatTimestamp(startTime)} ### Vocabulary Added (${entries.length} entries)\n\n${mappings}\n\n`,
  );
};

/** Log vocabulary entries updated (meaning → foreignForm) */
export const logVocabularyUpdated = (
  logFile: string | undefined,
  entries: { meaning: string; foreignForm: string }[],
  startTime?: number,
): void => {
  if (!logFile || entries.length === 0) return;
  const mappings = entries.map((e) => `  ${e.meaning} → ${e.foreignForm}`).join('\n');
  fs.appendFileSync(
    logFile,
    `${formatTimestamp(startTime)} ### Vocabulary Updated (${entries.length} entries)\n\n${mappings}\n\n`,
  );
};

/** Log vocabulary entries removed (foreignForm list) */
export const logVocabularyRemoved = (
  logFile: string | undefined,
  foreignForms: string[],
  startTime?: number,
): void => {
  if (!logFile || foreignForms.length === 0) return;
  const list = foreignForms.map((f) => `  - ${f}`).join('\n');
  fs.appendFileSync(
    logFile,
    `${formatTimestamp(startTime)} ### Vocabulary Removed (${foreignForms.length} entries)\n\n${list}\n\n`,
  );
};

/** Log vocabulary cleared */
export const logVocabularyCleared = (
  logFile: string | undefined,
  count: number,
  startTime?: number,
): void => {
  if (!logFile || count === 0) return;
  fs.appendFileSync(
    logFile,
    `${formatTimestamp(startTime)} ### Vocabulary Cleared (${count} entries)\n\n`,
  );
};

// Tester logging

/** Log sentence test result (ID + status) */
export const logSentenceTestResult = (
  logFile: string | undefined,
  id: string,
  status: string,
  startTime?: number,
): void => {
  if (!logFile) return;
  fs.appendFileSync(logFile, `${formatTimestamp(startTime)} [SENTENCE] #${id}: ${status}\n`);
};

/** Log rule test result (title + status) */
export const logRuleTestResult = (
  logFile: string | undefined,
  title: string,
  status: string,
  startTime?: number,
): void => {
  if (!logFile) return;
  fs.appendFileSync(logFile, `${formatTimestamp(startTime)} [RULE] "${title}": ${status}\n`);
};

/**
 * Log detailed verification results: each rule's pass/fail status with failure details.
 * Writes detailed per-rule sections to the markdown log.
 */
export const logVerificationResults = (
  logFile: string | undefined,
  sectionTitle: string,
  feedback: {
    rulesTestedCount: number;
    errantRules: string[];
    sentencesTestedCount: number;
    errantSentences: string[];
    conclusion: string;
    issues?: Array<{ title: string; description: string; recommendation: string }>;
    fullExplanation?: string;
  },
  allRuleTitles: string[],
  startTime?: number,
): void => {
  if (!logFile) return;

  let content = `${formatTimestamp(startTime)} ## ${sectionTitle}\n\n`;
  content += `**Conclusion:** ${feedback.conclusion}\n`;
  content += `**Rules tested:** ${feedback.rulesTestedCount} | **Errant:** ${feedback.errantRules.length}\n`;
  content += `**Sentences tested:** ${feedback.sentencesTestedCount} | **Errant:** ${feedback.errantSentences.length}\n\n`;

  // Per-rule status
  content += `### Per-Rule Status\n\n`;
  for (const title of allRuleTitles) {
    const isErrant = feedback.errantRules.includes(title);
    const status = isErrant ? 'FAIL' : 'PASS';
    content += `- **[${status}]** ${title}\n`;
  }
  content += `\n`;

  // Errant sentences
  if (feedback.errantSentences.length > 0) {
    content += `### Errant Sentences\n\n`;
    for (const sentenceId of feedback.errantSentences) {
      content += `- ${sentenceId}\n`;
    }
    content += `\n`;
  }

  // Issues (detailed failure reasons)
  if (feedback.issues && feedback.issues.length > 0) {
    content += `### Issues\n\n`;
    for (const issue of feedback.issues) {
      content += `#### ${issue.title}\n\n`;
      content += `${issue.description}\n\n`;
      content += `**Recommendation:** ${issue.recommendation}\n\n`;
    }
  }

  // Full explanation
  if (feedback.fullExplanation) {
    content += `### Full Explanation\n\n${feedback.fullExplanation}\n\n`;
  }

  content += `---\n\n`;
  fs.appendFileSync(logFile, content);
};
