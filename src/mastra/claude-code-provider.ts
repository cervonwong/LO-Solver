import { createClaudeCode, type ClaudeCodeProvider } from 'ai-sdk-provider-claude-code';

/**
 * All built-in Claude Code tools that must be blocked during server-side execution.
 * Deny rules override all other permission settings including bypassPermissions.
 */
export const CLAUDE_CODE_DISALLOWED_TOOLS = [
  // Filesystem
  'Bash',
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',
  'NotebookEdit',
  // Web
  'WebSearch',
  'WebFetch',
  // Agent management
  'Agent',
  'Task',
  'TaskOutput',
  'TaskStop',
  'TodoRead',
  'TodoWrite',
  // Plan mode
  'EnterPlanMode',
  'ExitPlanMode',
  // Other
  'AskUserQuestion',
  'Config',
] as const;

/**
 * Shared Claude Code provider with all built-in tools blocked.
 * Singleton -- Claude Code auth is CLI-level, no per-request key.
 *
 * Usage: claudeCode('sonnet'), claudeCode('opus'), claudeCode('haiku')
 */
export const claudeCode = createClaudeCode({
  defaultSettings: {
    disallowedTools: [...CLAUDE_CODE_DISALLOWED_TOOLS],
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
  },
});

export type { ClaudeCodeProvider };
