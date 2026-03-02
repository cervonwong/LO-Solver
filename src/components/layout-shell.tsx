'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { WorkflowControlProvider } from '@/contexts/workflow-control-context';
import { ModelModeToggle } from '@/components/model-mode-toggle';
import { WorkflowSliders } from '@/components/workflow-sliders';

export function LayoutShell({ children }: { children: ReactNode }) {
  return (
    <WorkflowControlProvider>
      <nav className="frosted flex shrink-0 items-center justify-between border border-border px-6 py-3">
        <Link href="/" className="hover-hatch-cyan font-heading text-sm text-foreground/80">
          LO-Solver
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/evals"
            className="hover-hatch-cyan font-heading text-sm text-foreground/80"
          >
            Eval Results
          </Link>
          <div className="h-5 w-px bg-border" />
          <WorkflowSliders />
          <div className="h-5 w-px bg-border" />
          <ModelModeToggle />
        </div>
      </nav>
      <main className="min-h-0 flex-1">{children}</main>
    </WorkflowControlProvider>
  );
}
