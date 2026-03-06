'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useModelMode } from '@/hooks/use-model-mode';
import { useApiKey } from '@/hooks/use-api-key';
import { useWorkflowSettings } from '@/hooks/use-workflow-settings';

export function useSolverWorkflow({ onReset }: { onReset?: () => void } = {}) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isAborting, setIsAborting] = useState(false);
  const [inputOpen, setInputOpen] = useState(true);
  const [problemText, setProblemText] = useState('');
  const hasSent = useRef(false);
  const [modelMode] = useModelMode();
  const [apiKey] = useApiKey();
  const [workflowSettings] = useWorkflowSettings();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/solve',
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            inputData: {
              rawProblemText:
                (messages[messages.length - 1]?.parts?.[0] as { text?: string } | undefined)
                  ?.text ?? '',
              modelMode,
              maxRounds: workflowSettings.maxRounds,
              perspectiveCount: workflowSettings.perspectiveCount,
              ...(apiKey && { apiKey }),
            },
          },
        }),
      }),
    [modelMode, apiKey, workflowSettings],
  );

  const { messages, sendMessage, status, setMessages, stop } = useChat({ transport });

  const handleSolve = useCallback(
    async (text: string) => {
      if (hasSent.current) return;
      hasSent.current = true;
      setHasStarted(true);
      setInputOpen(false);
      await sendMessage({ text });
    },
    [sendMessage],
  );

  // Wrap stop to set isAborting flag before closing the client stream
  const handleStop = useCallback(() => {
    setIsAborting(true);
    stop();
  }, [stop]);

  // Clear isAborting when the workflow is no longer running (abort completed)
  const isRunning = status === 'submitted' || status === 'streaming';
  useEffect(() => {
    if (isAborting && !isRunning) {
      setIsAborting(false);
    }
  }, [isAborting, isRunning]);

  const handleReset = useCallback(() => {
    hasSent.current = false;
    setHasStarted(false);
    setIsAborting(false);
    setInputOpen(true);
    setProblemText('');
    setMessages([]);
    onReset?.();
  }, [setMessages, onReset]);

  return {
    messages,
    status,
    hasStarted,
    isAborting,
    isRunning,
    handleSolve,
    handleStop,
    handleReset,
    setMessages,
    problemText,
    setProblemText,
    inputOpen,
    setInputOpen,
  };
}
