'use client';

import { useEffect, useState, useCallback, useRef, use } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { StepProgress } from '@/components/step-progress';
import { ResultsPanel } from '@/components/results-panel';
import type { ResultsPanelProps } from '@/components/results-panel';
import { useRunContext } from '@/components/run-context';
import Link from 'next/link';

type WorkflowResult = NonNullable<ResultsPanelProps['result']>;
type Rule = ResultsPanelProps['rules'][number];
type VocabularyEntry = ResultsPanelProps['vocabulary'][number];

type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

export default function RunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = use(params);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({});
  const [statusMessage, setStatusMessage] = useState('Waiting to start...');
  const startedRef = useRef(false);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyEntry[]>([]);
  const { setRunning, registerStopHandler } = useRunContext();

  const onData = useCallback(
    (dataPart: { type: string; data?: unknown }) => {
      try {
        const stored = JSON.parse(sessionStorage.getItem(`run-events-${runId}`) || '[]');
        stored.push(dataPart);
        sessionStorage.setItem(`run-events-${runId}`, JSON.stringify(stored));
      } catch {
        // Ignore storage errors
      }

      const partData = dataPart.data as { stepId: string; stepName: string } | undefined;
      if (!partData) return;

      if (dataPart.type === 'data-step-start') {
        setStepStatuses((prev) => ({ ...prev, [partData.stepId]: 'running' }));
        setStatusMessage(`Running: ${partData.stepName}...`);
      } else if (dataPart.type === 'data-step-complete') {
        setStepStatuses((prev) => ({ ...prev, [partData.stepId]: 'completed' }));
        setStatusMessage(`Completed: ${partData.stepName}`);
      }
    },
    [runId],
  );

  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/solve',
      prepareSendMessagesRequest: ({ messages: msgs }) => {
        const lastMsg = msgs[msgs.length - 1];
        const firstPart = lastMsg?.parts?.[0];
        const rawProblemText = firstPart && firstPart.type === 'text' ? firstPart.text : '';
        return { body: { inputData: { rawProblemText } } };
      },
    }),
    onData,
  });

  // Register stop handler with context so header nav can abort the stream
  useEffect(() => {
    registerStopHandler(() => stop());
  }, [registerStopHandler, stop]);

  // Track running state in context
  useEffect(() => {
    const running = started && (status === 'streaming' || status === 'submitted');
    setRunning(running);
    return () => setRunning(false);
  }, [started, status, setRunning]);

  // Warn on browser-level navigation (tab close, hard refresh)
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (started && (status === 'streaming' || status === 'submitted')) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [started, status]);

  // Start the workflow on mount (ref prevents double-fire in strict mode)
  useEffect(() => {
    if (startedRef.current) return;
    const problemText = sessionStorage.getItem(`run-${runId}`);
    if (!problemText) {
      setStatusMessage('');
      return;
    }
    startedRef.current = true;
    setStarted(true);
    setStatusMessage('Starting pipeline...');
    sendMessage({ text: problemText });
  }, [runId, sendMessage]);

  // Update status based on chat status
  useEffect(() => {
    if (status === 'error') {
      setStatusMessage('An error occurred.');
      setStepStatuses((prev) => {
        const updated = { ...prev };
        for (const key in updated) {
          if (updated[key] === 'running') {
            updated[key] = 'failed';
          }
        }
        return updated;
      });
      sessionStorage.setItem(`run-status-${runId}`, 'error');
    } else if (status === 'ready' && started && messages.length > 1) {
      setStatusMessage('Pipeline complete.');
      sessionStorage.setItem(`run-status-${runId}`, 'complete');
    }
  }, [status, started, messages.length, runId]);

  // Extract workflow results from streaming events stored in sessionStorage
  useEffect(() => {
    if (status !== 'ready' || !started || messages.length <= 1) return;
    if (result) return;

    try {
      const stored = JSON.parse(sessionStorage.getItem(`run-events-${runId}`) || '[]') as Array<{
        type: string;
        data?: unknown;
      }>;

      for (const event of stored) {
        if (!event.data || typeof event.data !== 'object') continue;
        const obj = event.data as Record<string, unknown>;

        if ('answers' in obj && 'success' in obj) {
          setResult(obj as unknown as WorkflowResult);
        }
        if ('rules' in obj && Array.isArray(obj.rules)) {
          setRules(obj.rules as Rule[]);
        }
        if ('vocabulary' in obj && Array.isArray(obj.vocabulary)) {
          setVocabulary(obj.vocabulary as VocabularyEntry[]);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [status, started, messages, result, runId]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <StepProgress stepStatuses={stepStatuses} />
      <p className="mt-4 text-sm text-muted-foreground">{statusMessage}</p>

      {error && (
        <div className="mt-4 rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">Error</p>
          <p className="mt-1 text-sm text-destructive/80">{error.message}</p>
        </div>
      )}

      {!started && !statusMessage && (
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">No problem text found for this run.</p>
          <Link href="/" className="mt-2 inline-block text-sm text-primary underline">
            Go back to submit a problem
          </Link>
        </div>
      )}

      <ResultsPanel result={result} rules={rules} vocabulary={vocabulary} />

      {started && (
        <div className="mt-8">
          <Link href={`/run/${runId}/trace`} className="text-sm text-primary underline">
            View detailed trace
          </Link>
        </div>
      )}
    </div>
  );
}
