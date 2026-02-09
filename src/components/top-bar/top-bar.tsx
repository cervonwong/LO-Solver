'use client';

import { ProblemInput } from './problem-input';
import { StepProgress } from './step-progress';
import { TopBarActions } from './top-bar-actions';

export function TopBar() {
  return (
    <div className="flex h-12 shrink-0 items-center border-b px-3">
      {/* Left: problem input */}
      <div className="flex shrink-0 items-center">
        <ProblemInput />
      </div>

      {/* Center: step progress (flexible, centered) */}
      <div className="flex flex-1 items-center justify-center">
        <StepProgress />
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center">
        <TopBarActions />
      </div>
    </div>
  );
}
