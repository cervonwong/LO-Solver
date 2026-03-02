'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MascotProvider, useMascotState } from '@/contexts/mascot-context';
import { useModelMode } from '@/hooks/use-model-mode';
import { useWorkflowSettings } from '@/hooks/use-workflow-settings';
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
import { RulesPanel } from '@/components/rules-panel';
import type { ActivityEvent } from '@/components/rolling-activity-chips';
import { getUIStepLabel, type UIStepId } from '@/lib/workflow-events';
import type {
  StepId,
  WorkflowTraceEvent,
  RulesUpdateEvent,
  RuleTestResultEvent,
  PerspectiveStartEvent,
  PerspectiveCompleteEvent,
  SynthesisStartEvent,
  SynthesisCompleteEvent,
  RoundStartEvent,
  RoundCompleteEvent,
} from '@/lib/workflow-events';

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
  timestamp: string;
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
  const [problemText, setProblemText] = useState('');
  const hasSent = useRef(false);
  const [modelMode] = useModelMode();
  const [workflowSettings] = useWorkflowSettings();

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
              maxRounds: workflowSettings.maxRounds,
              perspectiveCount: workflowSettings.perspectiveCount,
            },
          },
        }),
      }),
    [modelMode, workflowSettings],
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

    // Add Extract
    result.push({
      id: 'extract-structure',
      label: getUIStepLabel('extract-structure'),
      status: getStepStatus('extract-structure'),
    });

    // Parse round/perspective/synthesis events for multi-perspective progress
    const roundStartEvents = allParts.filter(
      (p) => 'type' in p && (p as { type: string }).type === 'data-round-start',
    ) as unknown as RoundStartEvent[];

    const roundCompleteEvents = allParts.filter(
      (p) => 'type' in p && (p as { type: string }).type === 'data-round-complete',
    ) as unknown as RoundCompleteEvent[];

    const perspectiveStartEvents = allParts.filter(
      (p) => 'type' in p && (p as { type: string }).type === 'data-perspective-start',
    ) as unknown as PerspectiveStartEvent[];

    const perspectiveCompleteEvents = allParts.filter(
      (p) => 'type' in p && (p as { type: string }).type === 'data-perspective-complete',
    ) as unknown as PerspectiveCompleteEvent[];

    const synthesisStartEvents = allParts.filter(
      (p) => 'type' in p && (p as { type: string }).type === 'data-synthesis-start',
    ) as unknown as SynthesisStartEvent[];

    const synthesisCompleteEvents = allParts.filter(
      (p) => 'type' in p && (p as { type: string }).type === 'data-synthesis-complete',
    ) as unknown as SynthesisCompleteEvent[];

    const hypothesisStepStatus = getStepStatus('multi-perspective-hypothesis');
    const hypothesisDone = hypothesisStepStatus === 'success' || hypothesisStepStatus === 'failed';

    // Build round-level progress
    const completedRounds = new Set(roundCompleteEvents.map((e) => e.data.round));
    const completedPerspectives = new Set(
      perspectiveCompleteEvents.map((e) => e.data.perspectiveId),
    );
    const completedSyntheses = new Set(synthesisCompleteEvents.map((e) => e.data.round));

    // Determine which round is currently running
    const latestRoundStart = roundStartEvents.at(-1);
    const latestPerspectiveStart = perspectiveStartEvents.at(-1);
    const latestSynthesisStart = synthesisStartEvents.at(-1);

    for (const roundEvent of roundStartEvents) {
      const roundNum = roundEvent.data.round;
      const roundId: UIStepId = `round-${roundNum}`;

      // Determine round status
      let roundStatus: StepStatus = 'pending';
      if (completedRounds.has(roundNum)) {
        roundStatus = hypothesisDone && hypothesisStepStatus === 'failed' ? 'failed' : 'success';
      } else if (latestRoundStart && latestRoundStart.data.round === roundNum) {
        roundStatus = hypothesisDone
          ? hypothesisStepStatus === 'success'
            ? 'success'
            : 'failed'
          : 'running';
      }

      result.push({
        id: roundId,
        label: getUIStepLabel(roundId),
        status: roundStatus,
      });

      // Add perspective sub-steps for this round
      const roundPerspectives = perspectiveStartEvents.filter((e) => e.data.round === roundNum);
      for (const perspEvent of roundPerspectives) {
        const perspId: UIStepId = `perspective-${perspEvent.data.perspectiveId}`;
        let perspStatus: StepStatus = 'pending';
        if (completedPerspectives.has(perspEvent.data.perspectiveId)) {
          perspStatus = 'success';
        } else if (
          latestPerspectiveStart &&
          latestPerspectiveStart.data.perspectiveId === perspEvent.data.perspectiveId
        ) {
          perspStatus = hypothesisDone
            ? hypothesisStepStatus === 'success'
              ? 'success'
              : 'failed'
            : 'running';
        }

        result.push({
          id: perspId,
          label: `  ${getUIStepLabel(perspId)}`,
          status: perspStatus,
        });
      }

      // Add synthesis step for this round (if synthesis has started)
      const hasSynthesisForRound = synthesisStartEvents.some((e) => e.data.round === roundNum);
      if (hasSynthesisForRound) {
        const synthesisId: UIStepId = `synthesis-${roundNum}`;
        let synthesisStatus: StepStatus = 'pending';
        if (completedSyntheses.has(roundNum)) {
          synthesisStatus = 'success';
        } else if (latestSynthesisStart && latestSynthesisStart.data.round === roundNum) {
          synthesisStatus = hypothesisDone
            ? hypothesisStepStatus === 'success'
              ? 'success'
              : 'failed'
            : 'running';
        }

        result.push({
          id: synthesisId,
          label: `  ${getUIStepLabel(synthesisId)}`,
          status: synthesisStatus,
        });
      }
    }

    // If the multi-perspective step is running but no round events yet, show it as running
    if (hypothesisStepStatus === 'running' && roundStartEvents.length === 0) {
      result.push({
        id: 'multi-perspective-hypothesis',
        label: getUIStepLabel('multi-perspective-hypothesis'),
        status: 'running',
      });
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
    'multi-perspective-hypothesis': 'Generating multi-perspective hypotheses...',
    'answer-questions': 'Applying rules to answer questions...',
  };
  const statusMessage =
    workflowStatus === 'success'
      ? 'Workflow complete.'
      : workflowStatus === 'failed' || workflowStatus === 'bailed'
        ? 'Workflow failed.'
        : activeStep
          ? (STATUS_MESSAGES[activeStep.id] ??
            (activeStep.id.startsWith('round-')
              ? `Running round ${activeStep.id.split('-')[1]}...`
              : activeStep.id.startsWith('perspective-')
                ? `Exploring ${getUIStepLabel(activeStep.id as UIStepId)}...`
                : activeStep.id.startsWith('synthesis-')
                  ? 'Synthesizing rulesets...'
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
    setProblemText('');
    setMessages([]);
    setMascotState('idle');
  }, [setMessages, setMascotState]);

  const answerStepOutput = steps['answer-questions']?.output;
  const hypothesisStepOutput = steps['multi-perspective-hypothesis']?.output;
  const finalRules =
    (hypothesisStepOutput?.rules as Array<{
      title: string;
      description: string;
      confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    }>) ?? undefined;

  // Accumulate vocabulary from data-vocabulary-update parts (only merged or untagged)
  const vocabParts = allParts.filter(
    (p) =>
      'type' in p &&
      p.type === 'data-vocabulary-update' &&
      (!(p as { data?: { source?: string } }).data?.source ||
        (p as { data?: { source?: string } }).data?.source === 'merged'),
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

  // Accumulate rules from data-rules-update parts (only merged or untagged)
  const rulesParts = allParts.filter(
    (p) =>
      'type' in p &&
      p.type === 'data-rules-update' &&
      (!(p as { data?: { source?: string } }).data?.source ||
        (p as { data?: { source?: string } }).data?.source === 'merged'),
  ) as Array<{ type: string; data: RulesUpdateEvent['data'] }>;

  const rules = useMemo(() => {
    const rulesMap = new Map<
      string,
      {
        title: string;
        description: string;
        confidence?: string;
        testStatus?: 'pass' | 'fail' | 'untested';
      }
    >();
    for (const part of rulesParts) {
      const { action, entries } = part.data;
      if (action === 'clear') {
        rulesMap.clear();
      } else if (action === 'remove') {
        for (const entry of entries) {
          rulesMap.delete(entry.title);
        }
      } else {
        for (const entry of entries) {
          const existing = rulesMap.get(entry.title);
          rulesMap.set(entry.title, {
            ...entry,
            testStatus: existing?.testStatus ?? 'untested',
          });
        }
      }
    }
    return Array.from(rulesMap.values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rulesParts.length]);

  // Apply rule test results to rules
  const ruleTestParts = allParts.filter(
    (p) => 'type' in p && p.type === 'data-rule-test-result',
  ) as Array<{ type: string; data: RuleTestResultEvent['data'] }>;

  const rulesWithTestStatus = useMemo(() => {
    const testResults = new Map<string, { passed: boolean; failingSentences?: string[] }>();
    for (const part of ruleTestParts) {
      const entry: { passed: boolean; failingSentences?: string[] } = {
        passed: part.data.passed,
      };
      if (part.data.failingSentences) {
        entry.failingSentences = part.data.failingSentences;
      }
      testResults.set(part.data.ruleTitle, entry);
    }
    return rules.map((rule) => {
      const testResult = testResults.get(rule.title);
      return {
        ...rule,
        testStatus: testResult
          ? testResult.passed
            ? ('pass' as const)
            : ('fail' as const)
          : (rule.testStatus ?? ('untested' as const)),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules, ruleTestParts.length]);

  // Build vocabulary activity events for rolling chips
  const vocabActivityEvents = useMemo(() => {
    const events: ActivityEvent[] = [];
    for (const part of vocabParts) {
      const data = part.data;
      const ts = new Date(data.timestamp).getTime();
      if (data.action === 'add') {
        events.push({
          label: `+${data.entries?.length ?? 1} added`,
          variant: 'add',
          timestamp: ts,
        });
      } else if (data.action === 'update') {
        events.push({
          label: `${data.entries?.length ?? 1} updated`,
          variant: 'update',
          timestamp: ts,
        });
      } else if (data.action === 'remove') {
        events.push({
          label: `${data.entries?.length ?? 1} removed`,
          variant: 'remove',
          timestamp: ts,
        });
      } else if (data.action === 'clear') {
        events.push({ label: 'Cleared', variant: 'clear', timestamp: ts });
      }
    }
    return events;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocabParts.length]);

  // Build rules activity events for rolling chips
  const rulesActivityEvents = useMemo(() => {
    const events: ActivityEvent[] = [];
    for (const part of rulesParts) {
      const data = part.data;
      const ts = new Date(data.timestamp).getTime();
      if (data.action === 'add') {
        events.push({
          label: `+${data.entries?.length ?? 1} added`,
          variant: 'add',
          timestamp: ts,
        });
      } else if (data.action === 'update') {
        events.push({
          label: `${data.entries?.length ?? 1} updated`,
          variant: 'update',
          timestamp: ts,
        });
      } else if (data.action === 'remove') {
        events.push({
          label: `${data.entries?.length ?? 1} removed`,
          variant: 'remove',
          timestamp: ts,
        });
      } else if (data.action === 'clear') {
        events.push({ label: 'Rules cleared', variant: 'clear', timestamp: ts });
      }
    }
    return events;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rulesParts.length]);

  // Auto-scroll to results when solve completes
  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isComplete && resultsRef.current) {
      const timer = setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isComplete]);

  // Cross-linking: scroll to and highlight a rule in the right-side Rules panel
  const handleRuleClick = useCallback((ruleTitle: string) => {
    const ruleEl = document.querySelector(`[data-rule-title="${CSS.escape(ruleTitle)}"]`);
    if (ruleEl) {
      ruleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ruleEl.classList.add('ring-2', 'ring-accent');
      setTimeout(() => {
        ruleEl.classList.remove('ring-2', 'ring-accent');
      }, 2000);
    }
  }, []);

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
          <div className="flex flex-col gap-6 py-6 pr-6">
            <LexMascot />

            <BlueprintCard>
              <Collapsible open={inputOpen} onOpenChange={setInputOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-1 text-left font-heading text-base text-foreground hover:text-accent">
                  Problem Input
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="16"
                    viewBox="0 -960 960 960"
                    width="16"
                    fill="currentColor"
                    className={`shrink-0 text-accent transition-transform duration-200 ${inputOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="M480-371.69 267.69-584 296-612.31l184 184 184-184L692.31-584 480-371.69Z" />
                  </svg>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <ProblemInput
                    examples={examples}
                    onSolve={handleSolve}
                    disabled={isRunning}
                    value={problemText}
                    onValueChange={setProblemText}
                    onTextChange={(hasText) => {
                      if (!hasStarted) setMascotState(hasText ? 'ready' : 'idle');
                    }}
                  />
                </CollapsibleContent>
              </Collapsible>
            </BlueprintCard>

            {hasStarted && (
              <BlueprintCard>
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex w-full items-center justify-between py-1 text-left font-heading text-base text-foreground hover:text-accent">
                    Progress
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="16"
                      viewBox="0 -960 960 960"
                      width="16"
                      fill="currentColor"
                      className="shrink-0 text-accent transition-transform duration-200 [[data-state=open]>&]:rotate-180"
                    >
                      <path d="M480-371.69 267.69-584 296-612.31l184 184 184-184L692.31-584 480-371.69Z" />
                    </svg>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <StepProgress
                      steps={progressSteps}
                      statusMessage={statusMessage}
                      onStepClick={handleStepClick}
                    />
                    {isFailed && (
                      <div className="mt-4 border border-destructive p-4 text-sm text-destructive">
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
                  </CollapsibleContent>
                </Collapsible>
              </BlueprintCard>
            )}

            {isComplete && answerStepOutput && (
              <div ref={resultsRef}>
                <BlueprintCard>
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex w-full items-center justify-between py-1 text-left font-heading text-base text-foreground hover:text-accent">
                      Results
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="16"
                        viewBox="0 -960 960 960"
                        width="16"
                        fill="currentColor"
                        className="shrink-0 text-accent transition-transform duration-200 [[data-state=open]>&]:rotate-180"
                      >
                        <path d="M480-371.69 267.69-584 296-612.31l184 184 184-184L692.31-584 480-371.69Z" />
                      </svg>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4">
                      <ResultsPanel
                        output={answerStepOutput}
                        rules={finalRules}
                        onRuleClick={handleRuleClick}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                </BlueprintCard>
              </div>
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

      {/* Right panel: Trace (top) + Vocabulary (middle) + Rules (bottom) */}
      <ResizablePanel defaultSize="65%" minSize="30%">
        <ResizablePanelGroup orientation="vertical">
          {/* Trace panel */}
          <ResizablePanel defaultSize="50%" minSize="20%" className="relative min-h-[120px]">
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

          {hasStarted && (
            <>
              <ResizableHandle withHandle />

              {/* Vocabulary panel */}
              <ResizablePanel defaultSize="25%" minSize="10%">
                <VocabularyPanel
                  vocabulary={vocabulary}
                  activityEvents={vocabActivityEvents}
                  isRunning={isRunning}
                />
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Rules panel */}
              <ResizablePanel defaultSize="25%" minSize="10%">
                <RulesPanel
                  rules={rulesWithTestStatus}
                  activityEvents={rulesActivityEvents}
                  isRunning={isRunning}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
