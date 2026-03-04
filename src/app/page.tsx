'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGroupRef } from 'react-resizable-panels';
import { MascotProvider, useMascotState } from '@/contexts/mascot-context';
import { useRegisterWorkflowControl } from '@/contexts/workflow-control-context';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useExamples } from '@/hooks/use-examples';
import { useSolverWorkflow } from '@/hooks/use-solver-workflow';
import { useWorkflowData } from '@/hooks/use-workflow-data';
import { useWorkflowProgress } from '@/hooks/use-workflow-progress';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ProblemInput } from '@/components/problem-input';
import { LexMascot } from '@/components/lex-mascot';
import { BlueprintCard } from '@/components/blueprint-card';
import { StepProgress } from '@/components/step-progress';
import { ResultsPanel } from '@/components/results-panel';
import { DevTracePanel } from '@/components/dev-trace-panel';
import { VocabularyPanel } from '@/components/vocabulary-panel';
import { RulesPanel } from '@/components/rules-panel';
import type { UIStepId } from '@/lib/workflow-events';

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
    } else if (isRunning) {
      setMascotState('solving');
    } else if (hasStarted) {
      setMascotState('aborted');
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
  const { examples } = useExamples();
  const groupRef = useGroupRef();
  const isLargeScreen = useMediaQuery('(min-width: 1024px)');
  const hasAnimated = useRef(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Mascot sync needs to be set up before useSolverWorkflow so we can pass onReset
  const { setMascotState } = useMascotState();

  const {
    messages,
    hasStarted,
    isAborting,
    isRunning,
    handleSolve,
    handleStop,
    handleReset: workflowReset,
    problemText,
    setProblemText,
    inputOpen,
    setInputOpen,
  } = useSolverWorkflow({ onReset: () => setMascotState('idle') });

  const handleReset = useCallback(() => {
    hasAnimated.current = false;
    workflowReset();
  }, [workflowReset]);

  // Derive allParts from messages (wiring between hooks)
  const assistantMessages = messages.filter((m) => m.role === 'assistant');
  const allParts = assistantMessages.flatMap((m) => m.parts ?? []);

  const {
    steps,
    workflowStatus,
    answerStepOutput,
    finalRules,
    vocabulary,
    rulesWithTestStatus,
    vocabActivityEvents,
    rulesActivityEvents,
    traceEvents,
  } = useWorkflowData(allParts);

  const isComplete = workflowStatus === 'success';
  const isFailed = workflowStatus === 'failed' || workflowStatus === 'bailed';
  const isAborted = hasStarted && !isRunning && !isComplete && !isFailed;

  const { displaySteps } = useWorkflowProgress(allParts, steps, { isAborted, isAborting });

  useMascotSync({ hasStarted, isComplete, isFailed, isRunning });

  useRegisterWorkflowControl({ isRunning, hasStarted, isAborting, stop: handleStop, handleReset });

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

  // Scroll-to handler for progress bar step clicks
  const handleStepClick = useCallback((stepId: UIStepId) => {
    const el = document.getElementById(`trace-${stepId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Determine if 3-column mode is active
  const showThirdColumn = hasStarted && isLargeScreen;

  // Animated transition when workflow starts on a wide screen
  useEffect(() => {
    if (hasStarted && isLargeScreen && !hasAnimated.current) {
      setIsTransitioning(true);
      requestAnimationFrame(() => {
        groupRef.current?.setLayout({
          'input-panel': 20,
          'trace-panel': 50,
          'vocab-rules-panel': 30,
        });
      });
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 650);
      hasAnimated.current = true;
      return () => clearTimeout(timer);
    }
  }, [hasStarted, isLargeScreen, groupRef]);

  // Reset animation flag when screen drops below breakpoint so it can replay
  useEffect(() => {
    if (!isLargeScreen) {
      hasAnimated.current = false;
    }
  }, [isLargeScreen]);

  return (
    <div
      className={
        isTransitioning
          ? 'panel-transition h-full border-t border-border'
          : 'h-full border-t border-border'
      }
    >
      <ResizablePanelGroup orientation="horizontal" className="h-full" groupRef={groupRef}>
        {/* Left panel: Input + Results */}
        <ResizablePanel
          id="input-panel"
          defaultSize={showThirdColumn ? '20%' : '50%'}
          minSize="15%"
        >
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-6 py-6 pr-6">
              <LexMascot />

              <BlueprintCard>
                <Collapsible open={inputOpen} onOpenChange={setInputOpen}>
                  <CollapsibleTrigger className="hover-hatch-cyan -m-[15px] flex w-[calc(100%+30px)] items-center justify-between p-[15px] text-left font-heading text-base text-foreground">
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
                    <CollapsibleTrigger className="hover-hatch-cyan -m-[15px] flex w-[calc(100%+30px)] items-center justify-between p-[15px] text-left font-heading text-base text-foreground">
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
                        steps={displaySteps}
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
                      {isAborted && (
                        <div className="mt-4 border border-status-warning p-4 text-sm text-status-warning">
                          <p className="mb-2 flex items-center gap-1.5 font-heading text-xs uppercase tracking-wider text-status-warning">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              height="16"
                              viewBox="0 -960 960 960"
                              width="16"
                              fill="currentColor"
                            >
                              <path d="M502.77-80Q425.38-80 358-117.12q-67.38-37.11-108.77-103.34l-152-244.31L133.46-501 320-377.77V-780h40v478.54L167.38-430.61l115.77 187.23q35 57.92 93.65 90.65Q435.44-120 502.77-120q106.83 0 182.03-74.42Q760-268.85 760-376.46V-760h40v383.54q0 123.83-86.54 210.14Q626.92-80 502.77-80Zm-35.85-420v-360h40v360h-40Zm146.93 0v-320h40v320h-40ZM463.69-310Z" />
                            </svg>
                            Workflow aborted
                          </p>
                          <p>
                            Partial results are preserved above. Start a new problem to try again.
                          </p>
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
                      <CollapsibleTrigger className="hover-hatch-cyan -m-[15px] flex w-[calc(100%+30px)] items-center justify-between p-[15px] text-left font-heading text-base text-foreground">
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
            </div>
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Middle panel: Trace (+ vocab/rules stacked when narrow or not started) */}
        <ResizablePanel
          id="trace-panel"
          defaultSize={showThirdColumn ? '50%' : '50%'}
          minSize="25%"
        >
          {showThirdColumn ? (
            // Wide screen + started: trace only (vocab/rules in third column)
            <div className="h-full min-h-[120px]">
              <DevTracePanel events={traceEvents} isRunning={isRunning} />
            </div>
          ) : (
            // Narrow screen OR not started: trace + vocab/rules stacked vertically
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel defaultSize="50%" minSize="20%" className="min-h-[120px]">
                <DevTracePanel events={traceEvents} isRunning={isRunning} />
              </ResizablePanel>

              {hasStarted && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize="25%" minSize="10%">
                    <VocabularyPanel
                      vocabulary={vocabulary}
                      activityEvents={vocabActivityEvents}
                      isRunning={isRunning}
                    />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
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
          )}
        </ResizablePanel>

        {/* Third column: Vocabulary + Rules (only on wide screens after workflow starts) */}
        {showThirdColumn && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel id="vocab-rules-panel" defaultSize="30%" minSize="15%">
              <ResizablePanelGroup orientation="vertical">
                <ResizablePanel defaultSize="50%" minSize="20%">
                  <VocabularyPanel
                    vocabulary={vocabulary}
                    activityEvents={vocabActivityEvents}
                    isRunning={isRunning}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize="50%" minSize="20%">
                  <RulesPanel
                    rules={rulesWithTestStatus}
                    activityEvents={rulesActivityEvents}
                    isRunning={isRunning}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
