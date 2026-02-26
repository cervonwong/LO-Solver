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
import { StepProgress, STEP_ORDER, type StepStatus } from '@/components/step-progress';
import { ResultsPanel } from '@/components/results-panel';
import { DevTracePanel } from '@/components/dev-trace-panel';
import { EXAMPLE_PROBLEMS, getExampleLabel } from '@/lib/examples';
import type { StepId, WorkflowTraceEvent } from '@/lib/workflow-events';

const STEP_STATUS_MESSAGES: Record<StepId, string> = {
  'extract-structure': 'Extracting problem structure...',
  'initial-hypothesis': 'Generating linguistic rules and vocabulary...',
  'verify-improve-rules-loop': 'Verifying and improving rules...',
  'answer-questions': 'Applying rules to answer questions...',
};

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

  // Derive step statuses for the progress bar
  const stepStatuses = {} as Record<StepId, StepStatus>;
  for (const stepId of STEP_ORDER) {
    const step = steps[stepId];
    if (!step) {
      stepStatuses[stepId] = 'pending';
    } else if (step.status === 'running') {
      stepStatuses[stepId] = 'running';
    } else if (step.status === 'success') {
      stepStatuses[stepId] = 'success';
    } else if (step.status === 'failed') {
      stepStatuses[stepId] = 'failed';
    } else {
      stepStatuses[stepId] = 'pending';
    }
  }

  // Find the active step for the status message
  const activeStep = STEP_ORDER.find((id) => stepStatuses[id] === 'running');
  const statusMessage =
    workflowStatus === 'success'
      ? 'Workflow complete.'
      : workflowStatus === 'failed' || workflowStatus === 'bailed'
        ? 'Workflow failed.'
        : activeStep
          ? STEP_STATUS_MESSAGES[activeStep]
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
              <StepProgress stepStatuses={stepStatuses} statusMessage={statusMessage} />
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
