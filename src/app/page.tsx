'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MascotProvider, useMascotState } from '@/contexts/mascot-context';
import { useModelMode } from '@/hooks/use-model-mode';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ProblemInput } from '@/components/problem-input';
import { LexMascot } from '@/components/lex-mascot';
import { BlueprintCard } from '@/components/blueprint-card';
import { StepProgress, type StepStatus, type ProgressStep } from '@/components/step-progress';
import { ResultsPanel } from '@/components/results-panel';
import { DevTracePanel } from '@/components/dev-trace-panel';
import { VocabularyPanel } from '@/components/vocabulary-panel';
import { getUIStepLabel, type UIStepId } from '@/lib/workflow-events';
import type { StepId, WorkflowTraceEvent, VerifyImprovePhaseEvent } from '@/lib/workflow-events';

interface WorkflowStepData {
  status: string;
  output?: Record<string, unknown>;
}

interface WorkflowData {
  name: string;
  status: string;
  steps: Record<string, WorkflowStepData>;
}

interface VocabUpdateData {
  action: 'add' | 'update' | 'remove' | 'clear';
  entries: Array<{ foreignForm: string; meaning: string; type: string; notes: string }>;
  totalCount: number;
}

function useMascotSync({
  hasStarted,
  isComplete,
  isFailed,
  isRunning,
}: {
  hasStarted: boolean;
  isComplete: boolean;
  isFailed: boolean;
  isRunning: boolean;
}) {
  const { setMascotState } = useMascotState();

  useEffect(() => {
    if (isFailed) {
      setMascotState('error');
    } else if (isComplete) {
      setMascotState('solved');
    } else if (isRunning || hasStarted) {
      setMascotState('solving');
    } else {
      setMascotState('idle');
    }
  }, [hasStarted, isComplete, isFailed, isRunning, setMascotState]);

  return setMascotState;
}

export default function SolverPage() {
  return (
    <MascotProvider>
      <SolverPageInner />
    </MascotProvider>
  );
}

function SolverPageInner() {
  const [examples, setExamples] = useState<Array<{ id: string; label: string; type: string }>>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [inputOpen, setInputOpen] = useState(true);
  const hasSent = useRef(false);
  const [modelMode] = useModelMode();

  useEffect(() => {
    fetch('/api/examples')
      .then((res) => res.json())
      .then((data) => setExamples(data.examples))
      .catch(() => {});
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/solve',
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            inputData: {
              rawProblemText:
                (messages[messages.length - 1]?.parts?.[0] as { text?: string } | undefined)
                  ?.text ?? '',
              modelMode,
            },
          },
        }),
      }),
    [modelMode],
  );

  const { messages, sendMessage, status, setMessages } = useChat({ transport });

  const handleSolve = useCallback(
    async (text: string) => {
      if (hasSent.current) return;
      hasSent.current = true;
      setHasStarted(true);
      setInputOpen(false);
      await sendMessage({ text });
    },
    [sendMessage],
  );

  // Collect all data parts from assistant messages
  const assistantMessages = messages.filter((m) => m.role === 'assistant');
  const allParts = assistantMessages.flatMap((m) => m.parts ?? []);

  // Extract the latest workflow data part
  const workflowParts = allParts.filter((p) => 'type' in p && p.type === 'data-workflow') as Array<{
    type: string;
    data: WorkflowData;
  }>;
  const workflowData = workflowParts.at(-1)?.data;
  const workflowStatus = workflowData?.status;
  const steps = workflowData?.steps ?? {};

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

    // Add Extract and Hypothesize
    result.push({
      id: 'extract-structure',
      label: getUIStepLabel('extract-structure'),
      status: getStepStatus('extract-structure'),
    });
    result.push({
      id: 'initial-hypothesis',
      label: getUIStepLabel('initial-hypothesis'),
      status: getStepStatus('initial-hypothesis'),
    });

    // Derive verify/improve steps from phase events
    const phaseEvents = allParts.filter(
      (p) => 'type' in p && (p as { type: string }).type === 'data-verify-improve-phase',
    ) as unknown as VerifyImprovePhaseEvent[];

    const loopStatus = getStepStatus('verify-improve-rules-loop');
    const loopDone = loopStatus === 'success' || loopStatus === 'failed';

    // Track which verify/improve steps have been seen
    const seenVerify = new Set<number>();
    const seenImprove = new Set<number>();
    let latestPhase: { iteration: number; phase: string } | null = null;

    for (const event of phaseEvents) {
      const { iteration, phase } = event.data;
      latestPhase = { iteration, phase };

      if (phase === 'verify-start' && !seenVerify.has(iteration)) {
        seenVerify.add(iteration);
      }
      if (phase === 'improve-start' && !seenImprove.has(iteration)) {
        seenImprove.add(iteration);
      }
    }

    // Build verify/improve steps in order
    const maxIter = Math.max(0, ...seenVerify, ...seenImprove);
    for (let i = 1; i <= maxIter; i++) {
      if (seenVerify.has(i)) {
        let status: StepStatus = 'pending';
        if (latestPhase && latestPhase.iteration === i && latestPhase.phase === 'verify-start') {
          status = loopDone ? (loopStatus === 'success' ? 'success' : 'failed') : 'running';
        } else {
          // Verify for this iteration has completed (we're past it)
          status = 'success';
        }
        result.push({
          id: `verify-${i}` as UIStepId,
          label: getUIStepLabel(`verify-${i}` as UIStepId),
          status,
        });
      }
      if (seenImprove.has(i)) {
        let status: StepStatus = 'pending';
        if (latestPhase && latestPhase.iteration === i && latestPhase.phase === 'improve-start') {
          status = loopDone ? (loopStatus === 'success' ? 'success' : 'failed') : 'running';
        } else {
          status = 'success';
        }
        result.push({
          id: `improve-${i}` as UIStepId,
          label: getUIStepLabel(`improve-${i}` as UIStepId),
          status,
        });
      }
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

  // Derive status message from progress steps
  const activeStep = progressSteps.find((s) => s.status === 'running');
  const STATUS_MESSAGES: Record<string, string> = {
    'extract-structure': 'Extracting problem structure...',
    'initial-hypothesis': 'Generating linguistic rules and vocabulary...',
    'answer-questions': 'Applying rules to answer questions...',
  };
  const statusMessage =
    workflowStatus === 'success'
      ? 'Workflow complete.'
      : workflowStatus === 'failed' || workflowStatus === 'bailed'
        ? 'Workflow failed.'
        : activeStep
          ? (STATUS_MESSAGES[activeStep.id] ??
            (activeStep.id.startsWith('verify-')
              ? 'Verifying rules...'
              : activeStep.id.startsWith('improve-')
                ? 'Improving rules...'
                : 'Processing...'))
          : status === 'submitted' || status === 'streaming'
            ? 'Starting workflow...'
            : undefined;

  // Extract results data
  const isComplete = workflowStatus === 'success';
  const isFailed = workflowStatus === 'failed' || workflowStatus === 'bailed';
  const isRunning = status === 'submitted' || status === 'streaming';
  const setMascotState = useMascotSync({ hasStarted, isComplete, isFailed, isRunning });

  const handleReset = useCallback(() => {
    hasSent.current = false;
    setHasStarted(false);
    setInputOpen(true);
    setMessages([]);
    setMascotState('idle');
  }, [setMessages, setMascotState]);

  const answerStepOutput = steps['answer-questions']?.output;
  const verifyStepOutput = steps['verify-improve-rules-loop']?.output;
  const rules =
    (verifyStepOutput?.rules as Array<{
      title: string;
      description: string;
      confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    }>) ?? undefined;

  // Accumulate vocabulary from data-vocabulary-update parts
  const vocabParts = allParts.filter(
    (p) => 'type' in p && p.type === 'data-vocabulary-update',
  ) as Array<{ type: string; data: VocabUpdateData }>;

  const vocabulary = useMemo(() => {
    const vocabMap = new Map<
      string,
      { foreignForm: string; meaning: string; type: string; notes: string }
    >();
    for (const part of vocabParts) {
      const { action, entries } = part.data;
      if (action === 'clear') {
        vocabMap.clear();
      } else if (action === 'remove') {
        for (const entry of entries) {
          vocabMap.delete(entry.foreignForm);
        }
      } else {
        for (const entry of entries) {
          vocabMap.set(entry.foreignForm, entry);
        }
      }
    }
    return Array.from(vocabMap.values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocabParts.length]);

  const mutationSummary = useMemo(() => {
    const summary = { added: 0, updated: 0, removed: 0 };
    for (const part of allParts) {
      if ('type' in part && part.type === 'data-vocabulary-update') {
        const data = (part as { type: string; data: VocabUpdateData }).data;
        if (data.action === 'add') summary.added += data.entries?.length ?? 1;
        else if (data.action === 'update') summary.updated += data.entries?.length ?? 1;
        else if (data.action === 'remove') summary.removed += data.entries?.length ?? 1;
      }
    }
    return summary;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allParts.length]);

  // Auto-scroll refs and state for the trace panel
  const traceEndRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Collect trace events for the dev trace panel
  const traceEvents = useMemo(() => {
    return allParts.filter(
      (p) =>
        'type' in p &&
        typeof (p as { type: string }).type === 'string' &&
        (p as { type: string }).type.startsWith('data-') &&
        (p as { type: string }).type !== 'data-workflow',
    ) as unknown as WorkflowTraceEvent[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allParts.length]);

  // Scroll-to handler for progress bar step clicks
  const handleStepClick = useCallback((stepId: UIStepId) => {
    const el = document.getElementById(`trace-${stepId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // IntersectionObserver to detect if user scrolled away from bottom
  useEffect(() => {
    const sentinel = traceEndRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsAtBottom(entry?.isIntersecting ?? false),
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Auto-scroll when new events arrive and user hasn't scrolled away
  useEffect(() => {
    if (isAtBottom && traceEndRef.current) {
      traceEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [traceEvents.length, isAtBottom]);

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full">
      {/* Left panel: Input + Results */}
      <ResizablePanel defaultSize="35%" minSize="25%">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-6 p-6">
            <LexMascot />

            <BlueprintCard>
              <Collapsible open={inputOpen} onOpenChange={setInputOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-1 text-left font-heading text-base text-foreground hover:text-accent">
                  Problem Input
                  <span className="text-xs text-accent">{inputOpen ? '\u25B2' : '\u25BC'}</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="animate-collapsible pt-4">
                  <ProblemInput
                    examples={examples}
                    onSolve={handleSolve}
                    disabled={isRunning}
                    onTextChange={(hasText) => {
                      if (!hasStarted) setMascotState(hasText ? 'ready' : 'idle');
                    }}
                  />
                </CollapsibleContent>
              </Collapsible>
            </BlueprintCard>

            {hasStarted && (
              <StepProgress
                steps={progressSteps}
                statusMessage={statusMessage}
                onStepClick={handleStepClick}
              />
            )}

            {isFailed && (
              <div className="border border-destructive p-4 text-sm text-destructive">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-destructive">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="16"
                    viewBox="0 -960 960 960"
                    width="16"
                    fill="currentColor"
                  >
                    <path d="M497.35-308.81q7.27-7.27 7.27-17.34 0-10.08-7.27-17.35-7.27-7.27-17.35-7.27-10.08 0-17.35 7.27-7.27 7.27-7.27 17.35 0 10.07 7.27 17.34t17.35 7.27q10.08 0 17.35-7.27ZM460-433.85h40v-240h-40v240ZM480.13-120q-74.67 0-140.41-28.34-65.73-28.34-114.36-76.92-48.63-48.58-76.99-114.26Q120-405.19 120-479.87q0-74.67 28.34-140.41 28.34-65.73 76.92-114.36 48.58-48.63 114.26-76.99Q405.19-840 479.87-840q74.67 0 140.41 28.34 65.73 28.34 114.36 76.92 48.63 48.58 76.99 114.26Q840-554.81 840-480.13q0 74.67-28.34 140.41-28.34 65.73-76.92 114.36-48.58 48.63-114.26 76.99Q554.81-120 480.13-120Zm-.13-40q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
                  </svg>
                  Error encountered.
                </p>
                <p>The workflow encountered an error. Check Mastra Studio for details.</p>
              </div>
            )}

            {isComplete && answerStepOutput && (
              <ResultsPanel output={answerStepOutput} rules={rules} />
            )}

            {(isComplete || isFailed) && !isRunning && (
              <button onClick={handleReset} className="stamp-btn-secondary w-fit text-sm">
                New Problem
              </button>
            )}
          </div>
        </ScrollArea>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Right panel: Trace (top) + Vocabulary (bottom) */}
      <ResizablePanel defaultSize="65%" minSize="30%">
        <ResizablePanelGroup orientation="vertical">
          {/* Trace panel */}
          <ResizablePanel defaultSize="70%" minSize="30%" className="relative">
            <ScrollArea className="h-full">
              <DevTracePanel events={traceEvents} isRunning={isRunning} />
              <div ref={traceEndRef} className="h-px" />
            </ScrollArea>
            {!isAtBottom && isRunning && (
              <button
                onClick={() => traceEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 border border-accent bg-background/80 px-3 py-1 text-xs uppercase tracking-wider text-accent transition-opacity hover:bg-muted"
              >
                Jump to latest &#8595;
              </button>
            )}
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Vocabulary panel */}
          <ResizablePanel defaultSize="30%" minSize="15%">
            <VocabularyPanel
              vocabulary={vocabulary}
              mutationSummary={mutationSummary}
              isRunning={isRunning}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
