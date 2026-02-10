'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useWorkflowStore } from './workflow-store';
import type { WorkflowEvent } from './workflow-events';

export function useWorkflowStream() {
  const addEvent = useWorkflowStore((s) => s.addEvent);
  const completeRun = useWorkflowStore((s) => s.completeRun);
  const errorRun = useWorkflowStore((s) => s.errorRun);
  const startRun = useWorkflowStore((s) => s.startRun);
  const runStatus = useWorkflowStore((s) => s.runStatus);
  const startedRef = useRef(false);

  const onData = useCallback(
    (dataPart: { type: string; data?: unknown }) => {
      // Only process known workflow event types
      if (
        typeof dataPart.type === 'string' &&
        dataPart.type.startsWith('data-') &&
        dataPart.data
      ) {
        addEvent(dataPart as WorkflowEvent);
      }
    },
    [addEvent],
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

  // Track completion/error
  useEffect(() => {
    if (!startedRef.current) return;

    if (status === 'error') {
      errorRun();
    } else if (status === 'ready' && messages.length > 1) {
      completeRun();
      startedRef.current = false;
    }
  }, [status, messages.length, errorRun, completeRun]);

  // Warn on browser navigation while running
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (startedRef.current && (status === 'streaming' || status === 'submitted')) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [status]);

  const solve = useCallback(
    (problemText: string) => {
      startedRef.current = true;
      startRun(problemText);
      sendMessage({ text: problemText });
    },
    [startRun, sendMessage],
  );

  const stopSolving = useCallback(() => {
    stop();
    startedRef.current = false;
  }, [stop]);

  return { solve, stop: stopSolving, status, error, runStatus };
}
