'use client';

const STEPS = [
  { id: 'extract-structure', label: 'Extract' },
  { id: 'initial-hypothesis', label: 'Hypothesize' },
  { id: 'verify-improve', label: 'Verify & Improve' },
  { id: 'answer-questions', label: 'Answer' },
] as const;

type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

interface StepProgressProps {
  stepStatuses: Record<string, StepStatus>;
}

export function StepProgress({ stepStatuses }: StepProgressProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2">
      {STEPS.map((step, i) => {
        const status = stepStatuses[step.id] ?? 'pending';
        return (
          <div key={step.id} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-0.5 w-8 transition-colors ${
                  status === 'pending' ? 'bg-muted' : 'bg-primary/80'
                }`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  status === 'completed'
                    ? 'bg-primary text-primary-foreground'
                    : status === 'running'
                      ? 'border-2 border-primary text-primary animate-pulse'
                      : status === 'failed'
                        ? 'bg-destructive text-destructive-foreground'
                        : 'border border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {status === 'completed' ? '\u2713' : i + 1}
              </div>
              <span
                className={`text-sm ${
                  status === 'running'
                    ? 'font-medium text-primary'
                    : status === 'completed'
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
