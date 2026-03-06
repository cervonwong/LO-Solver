'use client';

import Image from 'next/image';
import { XIcon } from 'lucide-react';
import { toast } from 'sonner';

interface WorkflowToastProps {
  id: string | number;
  title: string;
  message: string;
  accentColorClass: string;
  mascotImage: string;
}

export function WorkflowToast({ id, title, message, accentColorClass, mascotImage }: WorkflowToastProps) {
  return (
    <div className="blueprint-card flex items-center gap-3 bg-[rgba(0,40,80,0.95)] p-3">
      <Image src={mascotImage} alt="" width={32} height={32} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className={`font-heading text-xs uppercase tracking-wider ${accentColorClass}`}>{title}</p>
        <p className="font-sans text-xs text-foreground">{message}</p>
      </div>
      <button
        onClick={() => toast.dismiss(id)}
        className="shrink-0 cursor-pointer text-muted-foreground opacity-60 transition-opacity hover:opacity-100"
      >
        <XIcon size={14} />
      </button>
    </div>
  );
}

export function showSolveStartToast() {
  toast.custom(
    (id) => (
      <WorkflowToast
        id={id}
        title="SOLVING"
        message="Quack-ulating... my finest duck brains are on it!"
        accentColorClass="text-accent"
        mascotImage="/lex-thinking.png"
      />
    ),
    { id: 'solve-start' },
  );
}

export function showSolveCompleteToast(ruleCount: number, translationCount: number) {
  toast.custom(
    (id) => (
      <WorkflowToast
        id={id}
        title="COMPLETE"
        message={`${ruleCount} rules validated, ${translationCount} translations`}
        accentColorClass="text-foreground"
        mascotImage="/lex-happy.png"
      />
    ),
    { id: 'solve-complete' },
  );
}

export function showSolveAbortedToast() {
  toast.custom(
    (id) => (
      <WorkflowToast
        id={id}
        title="ABORTED"
        message="Solve canceled — partial results preserved"
        accentColorClass="text-foreground"
        mascotImage="/lex-neutral.png"
      />
    ),
    { id: 'solve-aborted' },
  );
}

export function showSolveErrorToast(stepName?: string) {
  const message = stepName ? `Failed at ${stepName}` : 'Something went wrong — check Mastra Studio';
  toast.custom(
    (id) => (
      <WorkflowToast
        id={id}
        title="ERROR"
        message={message}
        accentColorClass="text-destructive"
        mascotImage="/lex-defeated.png"
      />
    ),
    { id: 'solve-error' },
  );
}

export function showApiKeyErrorToast() {
  toast.custom(
    (id) => (
      <WorkflowToast
        id={id}
        title="API KEY ERROR"
        message="Check your key in settings — it may be invalid or expired"
        accentColorClass="text-destructive"
        mascotImage="/lex-defeated.png"
      />
    ),
    { id: 'api-key-error' },
  );
}

export function showCostWarningToast(amount: number) {
  const formatted = `$${amount.toFixed(2)}`;
  toast.custom(
    (id) => (
      <WorkflowToast
        id={id}
        title="COST WARNING"
        message={`${formatted} spent so far`}
        accentColorClass="text-status-warning"
        mascotImage="/lex-thinking.png"
      />
    ),
    { id: `cost-warning-${amount}` },
  );
}
