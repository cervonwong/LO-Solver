'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useProviderMode } from '@/hooks/use-provider-mode';
import { useApiKey } from '@/hooks/use-api-key';
import { useWorkflowSettings } from '@/hooks/use-workflow-settings';

export function useSolverWorkflow({ onReset }: { onReset?: () => void } = {}) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isAborting, setIsAborting] = useState(false);
  const [inputOpen, setInputOpen] = useState(true);
  const [problemText, setProblemText] = useState('');
  const hasSent = useRef(false);
  const [providerMode] = useProviderMode();
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
              providerMode,
              maxRounds: workflowSettings.maxRounds,
              perspectiveCount: workflowSettings.perspectiveCount,
            },
          },
          ...(apiKey && {
            headers: { 'x-openrouter-key': apiKey },
          }),
        }),
      }),
    [providerMode, apiKey, workflowSettings],
  );

  // Chat id changes when transport-relevant deps change, forcing useChat to
  // recreate the internal Chat instance (which captures transport at construction).
  const chatId = useMemo(
    () =>
      `solver-${apiKey ? apiKey.slice(-4) : 'none'}-${providerMode}-${workflowSettings.maxRounds}-${workflowSettings.perspectiveCount}`,
    [apiKey, providerMode, workflowSettings],
  );

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    transport,
    id: chatId,
  });

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
