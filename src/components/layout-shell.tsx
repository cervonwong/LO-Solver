'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WorkflowControlProvider, useWorkflowControl } from '@/contexts/workflow-control-context';
import { ModelModeToggle } from '@/components/model-mode-toggle';
import { WorkflowSliders } from '@/components/workflow-sliders';
import { CreditsBadge } from '@/components/credits-badge';

function NavBar() {
  const { isRunning, hasStarted, stop, handleReset } = useWorkflowControl();
  const pathname = usePathname();

  return (
    <nav className="frosted flex shrink-0 items-center justify-between border border-border px-6 py-1.5">
      {pathname === '/' ? (
        <span className="stamp-btn-nav-underline">
          <svg xmlns="http://www.w3.org/2000/svg" height="14" viewBox="0 -960 960 960" width="14" fill="currentColor" className="inline-block">
            <path d="M160-240v-480h640v480H160Zm237.62-260H760v-180H397.62v180Zm200.92 220H760v-180H598.54v180Zm-200.92 0h160.92v-180H397.62v180ZM200-280h157.62v-400H200v400Z"/>
          </svg>
          {"Lex's Dashboard"}
        </span>
      ) : (
        <Link href="/" className="stamp-btn-nav-underline">
          <svg xmlns="http://www.w3.org/2000/svg" height="14" viewBox="0 -960 960 960" width="14" fill="currentColor" className="inline-block">
            <path d="M160-240v-480h640v480H160Zm237.62-260H760v-180H397.62v180Zm200.92 220H760v-180H598.54v180Zm-200.92 0h160.92v-180H397.62v180ZM200-280h157.62v-400H200v400Z"/>
          </svg>
          {"Lex's Dashboard"}
        </Link>
      )}
      <div className="flex items-center gap-4">
        <div
          className={`flex items-center gap-4${isRunning ? ' opacity-50 pointer-events-none' : ''}`}
        >
          <Link
            href="/evals"
            className="stamp-btn-nav-underline"
            aria-disabled={isRunning || undefined}
            tabIndex={isRunning ? -1 : undefined}
          >
            Eval Results
            <svg xmlns="http://www.w3.org/2000/svg" height="14" viewBox="0 -960 960 960" width="14" fill="currentColor" className="inline-block">
              <path d="M683.15-460H200v-40h483.15L451.46-731.69 480-760l280 280-280 280-28.54-28.31L683.15-460Z"/>
            </svg>
          </Link>
          <div className="h-5 w-px bg-border" />
          <WorkflowSliders disabled={isRunning} />
          <div className="h-5 w-px bg-border" />
          <ModelModeToggle disabled={isRunning} />
        </div>
        <div className="h-5 w-px bg-border" />
        <CreditsBadge />
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-2">
          <button
            className="stamp-btn-nav-warning px-3 py-1"
            disabled={!isRunning}
            onClick={() => stop()}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="14"
              viewBox="0 -960 960 960"
              width="14"
              fill="currentColor"
              className="inline-block -mt-px mr-1"
            >
              <path d="M502.77-80Q425.38-80 358-117.12q-67.38-37.11-108.77-103.34l-152-244.31L133.46-501 320-377.77V-780h40v478.54L167.38-430.61l115.77 187.23q35 57.92 93.65 90.65Q435.44-120 502.77-120q106.83 0 182.03-74.42Q760-268.85 760-376.46V-760h40v383.54q0 123.83-86.54 210.14Q626.92-80 502.77-80Zm-35.85-420v-360h40v360h-40Zm146.93 0v-320h40v320h-40ZM463.69-310Z" />
            </svg>
            Abort
          </button>
          <button
            className="stamp-btn-nav-neutral px-3 py-1"
            disabled={isRunning || !hasStarted}
            onClick={() => handleReset()}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="14"
              viewBox="0 -960 960 960"
              width="14"
              fill="currentColor"
              className="inline-block -mt-px mr-1"
            >
              <path d="M140-208.46V-820h600v260.69q-5-.46-10-.57-5-.12-10-.12t-10 .12q-5 .11-10 .57V-780H180v440h300.69q-.46 5-.57 10-.12 5-.12 10t.12 10q.11 5 .57 10H231.54L140-208.46ZM284.62-620h310.76v-40H284.62v40Zm0 160h190.76v-40H284.62v40ZM700-180v-120H580v-40h120v-120h40v120h120v40H740v120h-40ZM180-340v-440 440Z" />
            </svg>
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
