import { cn } from '@/lib/utils';
import { STEP_LABELS, type StepId } from '@/lib/workflow-events';

export const STEP_ORDER: StepId[] = [
  'extract-structure',
  'initial-hypothesis',
  'verify-improve-rules-loop',
  'answer-questions',
];

export type StepStatus = 'pending' | 'running' | 'success' | 'failed';

interface CompletedIteration {
  iteration: number;
  conclusion: 'ALL_RULES_PASS' | 'NEEDS_IMPROVEMENT' | 'MAJOR_ISSUES';
  hadImprovePhase: boolean;
}

interface LoopState {
  currentIteration: number;
  currentPhase: 'verify' | 'improve' | 'complete';
  completedIterations: CompletedIteration[];
}

interface StepProgressProps {
  stepStatuses: Record<StepId, StepStatus>;
  statusMessage?: string | undefined;
  loopState?: LoopState | undefined;
}

type SubStep = {
  id: string;
  label: string;
  status: StepStatus;
};

function buildSubSteps(loopState: LoopState, overallStatus: StepStatus): SubStep[] {
  const subSteps: SubStep[] = [];

  for (const completed of loopState.completedIterations) {
    // Verify sub-step (always present)
    subSteps.push({
      id: `v${completed.iteration}`,
      label: `V${completed.iteration}`,
      status: 'success',
    });
    // Improve sub-step (only if the iteration had an improve phase)
    if (completed.hadImprovePhase) {
      subSteps.push({
        id: `i${completed.iteration}`,
        label: `I${completed.iteration}`,
        status: 'success',
      });
    }
  }

  // Add current in-progress sub-step(s) if the loop hasn't completed
  if (
    loopState.currentPhase !== 'complete' ||
    !loopState.completedIterations.some((i) => i.iteration === loopState.currentIteration)
  ) {
    const isCurrentlyComplete = overallStatus === 'success' || overallStatus === 'failed';

    if (loopState.currentPhase === 'verify') {
      subSteps.push({
        id: `v${loopState.currentIteration}`,
        label: `V${loopState.currentIteration}`,
        status: isCurrentlyComplete
          ? overallStatus === 'success'
            ? 'success'
            : 'failed'
          : 'running',
      });
    } else if (loopState.currentPhase === 'improve') {
      // Verify is done, improve is running
      subSteps.push({
        id: `v${loopState.currentIteration}`,
        label: `V${loopState.currentIteration}`,
        status: 'success',
      });
      subSteps.push({
        id: `i${loopState.currentIteration}`,
        label: `I${loopState.currentIteration}`,
        status: isCurrentlyComplete
          ? overallStatus === 'success'
            ? 'success'
            : 'failed'
          : 'running',
      });
    }
  }

  return subSteps;
}

function StepCircle({
  status,
  label,
  size = 'normal',
}: {
  status: StepStatus;
  label: string | number;
  size?: 'normal' | 'small';
}) {
  const isSmall = size === 'small';
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full border',
        isSmall ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs',
        status === 'running' && 'animate-pulse border-foreground bg-foreground text-background',
        status === 'success' && 'border-foreground bg-foreground text-background',
        status === 'failed' && 'border-destructive bg-destructive text-background',
        status === 'pending' && 'border-border text-muted-foreground',
      )}
    >
      {status === 'success' ? (
        <span>&#10003;</span>
      ) : status === 'failed' ? (
        <span>&#10007;</span>
      ) : (
        label
      )}
    </div>
  );
}

function Connector({
  active,
  variant = 'normal',
}: {
  active: boolean;
  variant?: 'normal' | 'sub';
}) {
  return (
    <div
      className={cn(
        'h-px flex-1',
        variant === 'sub' ? 'mx-0.5 min-w-2' : 'mx-1 min-w-3',
        active ? 'bg-foreground' : 'bg-border',
      )}
    />
  );
}

export function StepProgress({ stepStatuses, statusMessage, loopState }: StepProgressProps) {
  const verifyImproveStatus = stepStatuses['verify-improve-rules-loop'];
  const hasSubSteps = loopState && verifyImproveStatus !== 'pending';
  const subSteps = hasSubSteps ? buildSubSteps(loopState, verifyImproveStatus) : [];

  return (
    <div className="w-full">
      <div className="flex items-center">
        {STEP_ORDER.map((stepId, i) => {
          const status = stepStatuses[stepId];
          const isVerifyImprove = stepId === 'verify-improve-rules-loop';

          // For verify-improve with sub-steps, render the sub-step cluster
          if (isVerifyImprove && hasSubSteps && subSteps.length > 0) {
            return (
              <div key={stepId} className="flex items-center">
                {/* Connector from previous step */}
                <Connector active={status !== 'pending'} />

                {/* Sub-step cluster */}
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center">
                    {subSteps.map((sub, si) => (
                      <div key={sub.id} className="flex items-center">
                        {si > 0 && (
                          <Connector
                            active={sub.status === 'running' || sub.status === 'success'}
                            variant="sub"
                          />
                        )}
                        <StepCircle status={sub.status} label={sub.label} size="small" />
                      </div>
                    ))}
                  </div>
                  <span
                    className={cn(
                      'text-xs',
                      status === 'running' && 'font-bold text-foreground',
                      status === 'success' && 'text-foreground',
                      status === 'failed' && 'text-destructive',
                      status === 'pending' && 'text-muted-foreground',
                    )}
                  >
                    {STEP_LABELS[stepId]}
                  </span>
                </div>

                {/* Connector to next step */}
                <Connector active={status === 'success'} />
              </div>
            );
          }

          // Normal step rendering
          return (
            <div key={stepId} className="flex items-center">
              {i > 0 && !isVerifyImprove && (
                <Connector active={status === 'success' || status === 'running'} />
              )}
              {/* Skip connector for verify-improve when no sub-steps (it's rendered in the cluster) */}
              {i > 0 && isVerifyImprove && !hasSubSteps && (
                <Connector active={status === 'success' || status === 'running'} />
              )}
              <div className="flex flex-col items-center gap-1">
                <StepCircle status={status} label={i + 1} />
                <span
                  className={cn(
                    'text-xs',
                    status === 'running' && 'font-bold text-foreground',
                    status === 'success' && 'text-foreground',
                    status === 'failed' && 'text-destructive',
                    status === 'pending' && 'text-muted-foreground',
                  )}
                >
                  {STEP_LABELS[stepId]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {statusMessage && (
        <p className="mt-4 text-center text-sm text-muted-foreground">{statusMessage}</p>
      )}
    </div>
  );
}
