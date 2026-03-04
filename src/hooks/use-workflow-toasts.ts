'use client';

import { useEffect, useRef } from 'react';
import {
  showSolveStartToast,
  showSolveCompleteToast,
  showSolveAbortedToast,
  showSolveErrorToast,
  showCostWarningToast,
} from '@/components/workflow-toast';

interface UseWorkflowToastsOptions {
  hasStarted: boolean;
  isComplete: boolean;
  isFailed: boolean;
  isAborted: boolean;
  isRunning: boolean;
  finalRules?: Array<{ title: string; description: string; confidence?: string }> | undefined;
  answerStepOutput?: Record<string, unknown> | undefined;
  allParts: Array<Record<string, unknown>>;
}

export function useWorkflowToasts({
  hasStarted,
  isComplete,
  isFailed,
  isAborted,
  isRunning,
  finalRules,
  answerStepOutput,
  allParts,
}: UseWorkflowToastsOptions) {
  const prevRef = useRef({
    hasStarted: false,
    isComplete: false,
    isFailed: false,
    isAborted: false,
    wasRunning: false,
  });

  const lastCostBucketRef = useRef(0);

  useEffect(() => {
    const prev = prevRef.current;

    // Solve started: was not started, now is started and running
    if (hasStarted && !prev.hasStarted) {
      lastCostBucketRef.current = 0;
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

    // Aborted: was not aborted, now is — only if workflow was previously running
    // (prevents false abort toast on initial start when isRunning hasn't caught up yet)
    if (isAborted && !prev.isAborted && prev.wasRunning) {
      showSolveAbortedToast();
    }

    prevRef.current = { hasStarted, isComplete, isFailed, isAborted, wasRunning: isRunning };
  }, [hasStarted, isComplete, isFailed, isAborted, isRunning, finalRules, answerStepOutput]);

  // Watch for cost-update events and fire cost warning toasts
  useEffect(() => {
    const costEvents = allParts.filter(
      (p) => 'type' in p && (p as { type: string }).type === 'data-cost-update',
    ) as Array<{ type: string; data: { cumulativeCost: number } }>;

    if (costEvents.length === 0) return;

    const latestCost = costEvents[costEvents.length - 1]!.data.cumulativeCost;
    const latestBucket = Math.floor(latestCost);

    // Fire toast for any new buckets since last check
    if (latestBucket > lastCostBucketRef.current) {
      for (let i = lastCostBucketRef.current + 1; i <= latestBucket; i++) {
        showCostWarningToast(i);
      }
      lastCostBucketRef.current = latestBucket;
    }
  }, [allParts.length]);
}
