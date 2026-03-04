'use client';

import { useEffect, useRef } from 'react';
import {
  showSolveStartToast,
  showSolveCompleteToast,
  showSolveAbortedToast,
  showSolveErrorToast,
} from '@/components/workflow-toast';

interface UseWorkflowToastsOptions {
  hasStarted: boolean;
  isComplete: boolean;
  isFailed: boolean;
  isAborted: boolean;
  isRunning: boolean;
  finalRules?: Array<{ title: string; description: string; confidence?: string }> | undefined;
  answerStepOutput?: Record<string, unknown> | undefined;
}

export function useWorkflowToasts({
  hasStarted,
  isComplete,
  isFailed,
  isAborted,
  isRunning,
  finalRules,
  answerStepOutput,
}: UseWorkflowToastsOptions) {
  const prevRef = useRef({
    hasStarted: false,
    isComplete: false,
    isFailed: false,
    isAborted: false,
  });

  useEffect(() => {
    const prev = prevRef.current;

    // Solve started: was not started, now is started and running
    if (hasStarted && !prev.hasStarted) {
      showSolveStartToast();
    }

    // Completed: was not complete, now is
    if (isComplete && !prev.isComplete) {
      const ruleCount = finalRules?.length ?? 0;
      const translations = answerStepOutput?.translations;
      const translationCount = Array.isArray(translations) ? translations.length : 0;
      showSolveCompleteToast(ruleCount, translationCount);
    }

    // Failed: was not failed, now is
    if (isFailed && !prev.isFailed) {
      showSolveErrorToast();
    }

    // Aborted: was not aborted, now is
    if (isAborted && !prev.isAborted) {
      showSolveAbortedToast();
    }

    prevRef.current = { hasStarted, isComplete, isFailed, isAborted };
  }, [hasStarted, isComplete, isFailed, isAborted, isRunning, finalRules, answerStepOutput]);
}
