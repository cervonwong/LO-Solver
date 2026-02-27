'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useModelMode } from '@/hooks/use-model-mode';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ProblemInput } from '@/components/problem-input';
import { StepProgress, type StepStatus, type ProgressStep } from '@/components/step-progress';
import { ResultsPanel } from '@/components/results-panel';
import { DevTracePanel } from '@/components/dev-trace-panel';
import { EXAMPLE_PROBLEMS, getExampleLabel } from '@/lib/examples';
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

const examples = EXAMPLE_PROBLEMS.map((e) => ({ id: e.id, label: getExampleLabel(e) }));

export default function SolverPage() {
  const [hasStarted, setHasStarted] = useState(false);
  const [inputOpen, setInputOpen] = useState(true);
  const hasSent = useRef(false);
  const [modelMode] = useModelMode();

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

  const handleReset = useCallback(() => {
    hasSent.current = false;
    setHasStarted(false);
    setInputOpen(true);
    setMessages([]);
  }, [setMessages]);

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

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full">
      <ResizablePanel defaultSize="35%" minSize="25%">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-6 p-6">
            <Collapsible open={inputOpen} onOpenChange={setInputOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded border border-border px-3 py-2 text-left text-sm font-medium hover:bg-accent">
                Problem Input
                <span className="text-xs text-muted-foreground">{inputOpen ? '▲' : '▼'}</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <ProblemInput examples={examples} onSolve={handleSolve} disabled={isRunning} />
              </CollapsibleContent>
            </Collapsible>

            {hasStarted && (
              <StepProgress
                steps={progressSteps}
                statusMessage={statusMessage}
                onStepClick={handleStepClick}
              />
            )}

            {isFailed && (
              <div className="rounded border border-destructive p-4 text-sm text-destructive">
                The workflow encountered an error. Check Mastra Studio for details.
              </div>
            )}

            {isComplete && answerStepOutput && (
              <ResultsPanel output={answerStepOutput} rules={rules} vocabulary={vocabulary} />
            )}

            {(isComplete || isFailed) && !isRunning && (
              <Button variant="outline" onClick={handleReset} className="w-fit text-xs">
                New problem
              </Button>
            )}
          </div>
        </ScrollArea>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize="65%" minSize="30%">
        <ScrollArea className="h-full">
          <DevTracePanel events={traceEvents} isRunning={isRunning} />
        </ScrollArea>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
