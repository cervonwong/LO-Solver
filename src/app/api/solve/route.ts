import { handleWorkflowStream } from '@mastra/ai-sdk';
import { createUIMessageStreamResponse } from 'ai';
import { mastra } from '@/mastra';

export async function POST(req: Request) {
  const body = await req.json();

  const stream = await handleWorkflowStream({
    mastra,
    workflowId: '03-per-rule-per-sentence-delegation-workflow',
    params: {
      inputData: body.inputData,
    },
  });

  return createUIMessageStreamResponse({ stream });
}
