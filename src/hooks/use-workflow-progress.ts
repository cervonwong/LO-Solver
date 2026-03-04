'use client';

import { useMemo } from 'react';
import type { StepStatus, ProgressStep } from '@/components/step-progress';
import { getUIStepLabel, type UIStepId } from '@/lib/workflow-events';
import type {
  StepId,
  RoundStartEvent,
  RoundCompleteEvent,
  PerspectiveStartEvent,
  PerspectiveCompleteEvent,
  SynthesisStartEvent,
  SynthesisCompleteEvent,
} from '@/lib/workflow-events';

interface WorkflowStepData {
  status: string;
  output?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useWorkflowProgress(
  allParts: any[],
  steps: Record<string, WorkflowStepData>,
  {
    isAborted,
    isAborting,
  }: {
    isAborted: boolean;
    isAborting: boolean;
  },
) {
  // Build the dynamic progress step list
  const progressSteps: ProgressStep[] = useMemo(() => {
    const result: ProgressStep[] = [];

    // Helper to derive status for a backend StepId
    function getStepStatus(stepId: StepId): StepStatus {
      const step = steps[stepId];
      if (!step) return 'pending';
      if (step.status === 'running') return 'running';
      if (step.status === 'success') return 'success';
      if (step.status === 'failed') return 'failed';
      return 'pending';
    }

    // Add Extract
    result.push({
      id: 'extract-structure',
      label: getUIStepLabel('extract-structure'),
      status: getStepStatus('extract-structure'),
    });

    // Parse round/perspective/synthesis events for multi-perspective progress
    const roundStartEvents = allParts.filter(
      (p) => 'type' in p && (p as { type: string }).type === 'data-round-start',
    ) as unknown as RoundStartEvent[];

    const roundCompleteEvents = allParts.filter(
      (p) => 'type' in p && (p as { type: string }).type === 'data-round-complete',
    ) as unknown as RoundCompleteEvent[];

    const perspectiveStartEvents = allParts.filter(
      (p) => 'type' in p && (p as { type: string }).type === 'data-perspective-start',
    ) as unknown as PerspectiveStartEvent[];

    const perspectiveCompleteEvents = allParts.filter(
      (p) => 'type' in p && (p as { type: string }).type === 'data-perspective-complete',
    ) as unknown as PerspectiveCompleteEvent[];

    const synthesisStartEvents = allParts.filter(
      (p) => 'type' in p && (p as { type: string }).type === 'data-synthesis-start',
    ) as unknown as SynthesisStartEvent[];

    const synthesisCompleteEvents = allParts.filter(
      (p) => 'type' in p && (p as { type: string }).type === 'data-synthesis-complete',
    ) as unknown as SynthesisCompleteEvent[];

    const hypothesisStepStatus = getStepStatus('multi-perspective-hypothesis');
    const hypothesisDone = hypothesisStepStatus === 'success' || hypothesisStepStatus === 'failed';

    // Build round-level progress
    const completedRounds = new Set(roundCompleteEvents.map((e) => e.data.round));
    const completedPerspectives = new Set(
      perspectiveCompleteEvents.map((e) => e.data.perspectiveId),
    );
    const completedSyntheses = new Set(synthesisCompleteEvents.map((e) => e.data.round));

    // Determine which round is currently running
    const latestRoundStart = roundStartEvents.at(-1);
    const latestPerspectiveStart = perspectiveStartEvents.at(-1);
    const latestSynthesisStart = synthesisStartEvents.at(-1);

    for (const roundEvent of roundStartEvents) {
      const roundNum = roundEvent.data.round;
      const roundId: UIStepId = `round-${roundNum}`;

      // Determine round status
      let roundStatus: StepStatus = 'pending';
      if (completedRounds.has(roundNum)) {
        roundStatus = hypothesisDone && hypothesisStepStatus === 'failed' ? 'failed' : 'success';
      } else if (latestRoundStart && latestRoundStart.data.round === roundNum) {
        roundStatus = hypothesisDone
          ? hypothesisStepStatus === 'success'
            ? 'success'
            : 'failed'
          : 'running';
      }

      result.push({
        id: roundId,
        label: getUIStepLabel(roundId),
        status: roundStatus,
      });

      // Add perspective sub-steps for this round
      const roundPerspectives = perspectiveStartEvents.filter((e) => e.data.round === roundNum);
      for (const perspEvent of roundPerspectives) {
        const perspId: UIStepId = `perspective-${perspEvent.data.perspectiveId}`;
        let perspStatus: StepStatus = 'pending';
        if (completedPerspectives.has(perspEvent.data.perspectiveId)) {
          perspStatus = 'success';
        } else if (
          latestPerspectiveStart &&
          latestPerspectiveStart.data.perspectiveId === perspEvent.data.perspectiveId
        ) {
          perspStatus = hypothesisDone
            ? hypothesisStepStatus === 'success'
              ? 'success'
              : 'failed'
            : 'running';
        }

        result.push({
          id: perspId,
          label: `  ${getUIStepLabel(perspId)}`,
          status: perspStatus,
        });
      }

      // Add synthesis step for this round (if synthesis has started)
      const hasSynthesisForRound = synthesisStartEvents.some((e) => e.data.round === roundNum);
      if (hasSynthesisForRound) {
        const synthesisId: UIStepId = `synthesis-${roundNum}`;
        let synthesisStatus: StepStatus = 'pending';
        if (completedSyntheses.has(roundNum)) {
          synthesisStatus = 'success';
        } else if (latestSynthesisStart && latestSynthesisStart.data.round === roundNum) {
          synthesisStatus = hypothesisDone
            ? hypothesisStepStatus === 'success'
              ? 'success'
              : 'failed'
            : 'running';
        }

        result.push({
          id: synthesisId,
          label: `  ${getUIStepLabel(synthesisId)}`,
          status: synthesisStatus,
        });
      }
    }

    // If the multi-perspective step is running but no round events yet, show it as running
    if (hypothesisStepStatus === 'running' && roundStartEvents.length === 0) {
      result.push({
        id: 'multi-perspective-hypothesis',
        label: getUIStepLabel('multi-perspective-hypothesis'),
        status: 'running',
      });
    }

    // Add Answer
    result.push({
      id: 'answer-questions',
      label: getUIStepLabel('answer-questions'),
      status: getStepStatus('answer-questions'),
    });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allParts.length, steps]);

  // When aborted or aborting, convert any 'running' steps to 'aborted'
  const displaySteps: ProgressStep[] =
    isAborted || isAborting
      ? progressSteps.map((s) =>
          s.status === 'running' ? { ...s, status: 'aborted' as StepStatus } : s,
        )
      : progressSteps;

  return { progressSteps, displaySteps };
}
