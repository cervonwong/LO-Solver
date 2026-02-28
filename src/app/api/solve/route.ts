import { handleWorkflowStream } from '@mastra/ai-sdk';
import { createUIMessageStreamResponse } from 'ai';
import { mastra } from '@/mastra';

export const maxDuration = 600;

export async function POST(req: Request) {
  const params = await req.json();
  const stream = await handleWorkflowStream({
    mastra,
    workflowId: 'solver-workflow',
    params,
  });
  return createUIMessageStreamResponse({ stream });
}
