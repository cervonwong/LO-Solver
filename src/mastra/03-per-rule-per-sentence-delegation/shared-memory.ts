import * as crypto from 'crypto';

// Generate unique IDs per workflow run (for logging purposes)
export function generateWorkflowIds(): { threadId: string; resourceId: string } {
  const runId = crypto.randomUUID();
  return {
    threadId: `wf03-thread-${runId}`,
    resourceId: `wf03-resource-${runId}`,
  };
}
