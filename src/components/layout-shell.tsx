'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WorkflowControlProvider, useWorkflowControl } from '@/contexts/workflow-control-context';
import { ModelModeToggle } from '@/components/model-mode-toggle';
import { WorkflowSliders } from '@/components/workflow-sliders';

function NavBar() {
  const { isRunning, hasStarted, stop, handleReset } = useWorkflowControl();
  const pathname = usePathname();

  return (
    <nav className="frosted flex shrink-0 items-center justify-between border border-border px-6 py-3">
      {pathname === '/' ? (
        <span className="font-heading text-sm text-foreground/80">LO-Solver</span>
      ) : (
        <Link href="/" className="hover-hatch-cyan hover-hatch-border px-3 py-1.5 font-heading text-sm text-foreground/80">
          LO-Solver
        </Link>
      )}
      <div className="flex items-center gap-4">
        <div
          className={`flex items-center gap-4${isRunning ? ' opacity-50 pointer-events-none' : ''}`}
        >
          <Link
            href="/evals"
            className="hover-hatch-cyan hover-hatch-border px-3 py-1.5 font-heading text-sm text-foreground/80"
            aria-disabled={isRunning || undefined}
            tabIndex={isRunning ? -1 : undefined}
          >
            Eval Results
          </Link>
          <div className="h-5 w-px bg-border" />
          <WorkflowSliders disabled={isRunning} />
          <div className="h-5 w-px bg-border" />
          <ModelModeToggle disabled={isRunning} />
        </div>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-2">
          <button
            className="stamp-btn-warning px-3 py-1 text-xs"
            disabled={!isRunning}
            onClick={() => stop()}
          >
            Abort
          </button>
          <button
            className="stamp-btn-secondary px-3 py-1 text-xs"
            disabled={!hasStarted || isRunning}
            onClick={() => handleReset()}
          >
            New Problem
          </button>
        </div>
      </div>
    </nav>
  );
}

export function LayoutShell({ children }: { children: ReactNode }) {
  return (
    <WorkflowControlProvider>
      <NavBar />
      <main className="min-h-0 flex-1">{children}</main>
    </WorkflowControlProvider>
  );
}
