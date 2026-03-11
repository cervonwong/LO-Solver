import { toAISdkStream } from '@mastra/ai-sdk';
import { generateText, createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { claudeCode } from '@/mastra/claude-code-provider';
import { mastra } from '@/mastra';
import { activeRuns } from './active-runs';

export const maxDuration = 600;

export async function POST(req: Request) {
  const params = await req.json();

  // Extract API key from inputData — key stays in inputData for the workflow schema
  // but we check availability here for early rejection
  const apiKey: string | undefined = params.inputData?.apiKey;
  const providerMode = params.inputData?.providerMode ?? 'openrouter-testing';

  // OpenRouter modes require an API key
  if (providerMode !== 'claude-code' && !apiKey && !process.env.OPENROUTER_API_KEY) {
    return new Response(JSON.stringify({ error: 'No API key provided' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Claude Code auth gate: verify authentication before starting the workflow
  if (providerMode === 'claude-code') {
    try {
      await generateText({
        model: claudeCode('claude-sonnet-4-6'),
        prompt: 'Respond with OK',
        maxOutputTokens: 10,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes('authentication_failed') ||
        message.includes('not authenticated') ||
        message.includes('spawn') ||
        message.includes('ENOENT')
      ) {
        return new Response(
          JSON.stringify({
            error:
              'Claude Code is not authenticated. Run `claude login` in your terminal, then try again.',
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        );
      }
      // Re-throw non-auth errors
      return new Response(JSON.stringify({ error: `Claude Code error: ${message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
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
