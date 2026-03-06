import { toAISdkStream } from '@mastra/ai-sdk';
import { createUIMessageStream } from 'ai';
import { createUIMessageStreamResponse } from 'ai';
import { mastra } from '@/mastra';
import { activeRuns } from './active-runs';

export const maxDuration = 600;

export async function POST(req: Request) {
  const params = await req.json();

  // Extract API key from inputData — key stays in inputData for the workflow schema
  // but we check availability here for early rejection
  const apiKey: string | undefined = params.inputData?.apiKey;

  if (!apiKey && !process.env.OPENROUTER_API_KEY) {
    return new Response(JSON.stringify({ error: 'No API key provided' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const workflow = mastra.getWorkflowById('solver-workflow')!;
  const run = await workflow.createRun();

  activeRuns.set(run.runId, run);

  const workflowStream = run.stream({
    inputData: params.inputData,
  });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      try {
        for await (const part of toAISdkStream(workflowStream as any, {
          from: 'workflow',
          includeTextStreamParts: true,
        })) {
          writer.write(part);
        }
      } finally {
        activeRuns.delete(run.runId);
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
