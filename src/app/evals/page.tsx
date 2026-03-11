'use client';

import { useCallback, useEffect, useState } from 'react';
import { BlueprintCard } from '@/components/blueprint-card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface QuestionDetail {
  questionIndex: number;
  predicted: string;
  expected: string[];
  correct: boolean;
}

interface ZeroShotData {
  score: number;
  reason: string;
  correctCount: number;
  details: QuestionDetail[];
}

interface ExtractionScore {
  success: boolean;
  questionsFound: number;
  expectedQuestions: number;
  score: number;
}

interface RuleQualityScore {
  totalRules: number;
  passingRules: number;
  totalSentencesTested: number;
  passingSentences: number;
  verifierConclusion: string;
  score: number;
  iterations: number;
  roundDetails?: Array<{
    round: number;
    convergencePassRate: number;
    convergenceConclusion: string;
    converged: boolean;
    perspectiveCount: number;
  }>;
}

interface EvalProblemResult {
  problemId: string;
  title: string;
  score: number;
  reason: string;
  totalQuestions: number;
  correctCount: number;
  details: QuestionDetail[];
  zeroShot?: ZeroShotData;
  intermediateScores?: {
    extraction: ExtractionScore;
    ruleQuality: RuleQualityScore;
  };
}

interface EvalRunResult {
  id: string;
  timestamp: string;
  providerMode: string;
  gitCommit?: string;
  duration: number;
  problems: EvalProblemResult[];
  comparison?: boolean;
  summary: {
    totalProblems: number;
    meanScore: number;
    totalQuestions: number;
    totalCorrect: number;
    overallAccuracy: number;
    zeroShot?: {
      meanScore: number;
      overallAccuracy: number;
      totalCorrect: number;
    };
    delta?: {
      meanScore: number;
      overallAccuracy: number;
    };
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function DeltaValue({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={positive ? 'text-[--status-success]' : 'text-destructive'}>
      {positive ? '+' : ''}
      {pct(value)}
    </span>
  );
}

function ChevronIcon({ open }: { open?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="16"
      viewBox="0 -960 960 960"
      width="16"
      fill="currentColor"
      className={`shrink-0 text-accent transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path d="M480-371.69 267.69-584 296-612.31l184 184 184-184L692.31-584 480-371.69Z" />
    </svg>
  );
}

function ProblemBreakdown({ problem }: { problem: EvalProblemResult }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="hover-hatch-cyan flex w-full items-center justify-between border-b border-border-subtle px-3 py-2 text-left text-sm">
        <div className="flex items-center gap-3">
          <span className="font-sans text-foreground">{problem.problemId}</span>
          <span className="text-muted-foreground">{problem.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-foreground/80">
            {pct(problem.score)} ({problem.correctCount}/{problem.totalQuestions})
          </span>
          <ChevronIcon open={open} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-4 px-3 py-3">
          {/* Per-question table */}
          <div>
            <h4 className="mb-2 font-heading text-xs uppercase tracking-wider text-muted-foreground">
              Workflow answers
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-xs">Q#</TableHead>
                  <TableHead className="text-xs">Predicted</TableHead>
                  <TableHead className="text-xs">Expected</TableHead>
                  <TableHead className="w-16 text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {problem.details.map((d) => (
                  <TableRow key={d.questionIndex}>
                    <TableCell className="text-muted-foreground">{d.questionIndex + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{d.predicted}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {d.expected.join(' / ')}
                    </TableCell>
                    <TableCell>
                      {d.correct ? (
                        <span className="text-foreground/80">PASS</span>
                      ) : (
                        <span className="text-destructive">FAIL</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Zero-shot comparison */}
          {problem.zeroShot && (
            <div>
              <h4 className="mb-2 font-heading text-xs uppercase tracking-wider text-muted-foreground">
                Zero-shot answers ({problem.zeroShot.correctCount}/{problem.totalQuestions})
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-xs">Q#</TableHead>
                    <TableHead className="text-xs">Predicted</TableHead>
                    <TableHead className="text-xs">Expected</TableHead>
                    <TableHead className="w-16 text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {problem.zeroShot.details.map((d) => (
                    <TableRow key={d.questionIndex}>
                      <TableCell className="text-muted-foreground">
                        {d.questionIndex + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{d.predicted}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {d.expected.join(' / ')}
                      </TableCell>
                      <TableCell>
                        {d.correct ? (
                          <span className="text-foreground/80">PASS</span>
                        ) : (
                          <span className="text-destructive">FAIL</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Intermediate scores */}
          {problem.intermediateScores && (
            <div>
              <h4 className="mb-2 font-heading text-xs uppercase tracking-wider text-muted-foreground">
                Intermediate scores
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="border border-border-subtle p-2">
                  <div className="mb-1 text-muted-foreground">Extraction</div>
                  <div className="text-foreground/80">
                    Score: {pct(problem.intermediateScores.extraction.score)}
                  </div>
                  <div className="text-muted-foreground">
                    {problem.intermediateScores.extraction.questionsFound}/
                    {problem.intermediateScores.extraction.expectedQuestions} questions found
                  </div>
                </div>
                <div className="border border-border-subtle p-2">
                  <div className="mb-1 text-muted-foreground">Rule quality</div>
                  <div className="text-foreground/80">
                    Score: {pct(problem.intermediateScores.ruleQuality.score)}
                  </div>
                  <div className="text-muted-foreground">
                    {problem.intermediateScores.ruleQuality.passingRules}/
                    {problem.intermediateScores.ruleQuality.totalRules} rules passing,{' '}
                    {problem.intermediateScores.ruleQuality.iterations} iteration
                    {problem.intermediateScores.ruleQuality.iterations !== 1 ? 's' : ''}
                  </div>
                </div>
                {/* Round-by-round details */}
                {problem.intermediateScores.ruleQuality.roundDetails &&
                  problem.intermediateScores.ruleQuality.roundDetails.length > 0 && (
                    <div className="col-span-2 border border-border-subtle p-2">
                      <div className="mb-1 text-muted-foreground">Round-by-round verification</div>
                      <div className="space-y-1">
                        {problem.intermediateScores.ruleQuality.roundDetails.map((rd) => (
                          <div
                            key={rd.round}
                            className="flex items-center gap-2 text-foreground/80"
                          >
                            <span className="font-mono">R{rd.round}</span>
                            <span>{pct(rd.convergencePassRate)} pass</span>
                            <Badge
                              variant={
                                rd.convergenceConclusion === 'ALL_RULES_PASS'
                                  ? 'default'
                                  : rd.convergenceConclusion === 'NEEDS_IMPROVEMENT'
                                    ? 'secondary'
                                    : 'destructive'
                              }
                              className="px-1 py-0 text-[10px]"
                            >
                              {rd.converged
                                ? 'converged'
                                : rd.convergenceConclusion.toLowerCase().replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-muted-foreground">
                              {rd.perspectiveCount} perspective
                              {rd.perspectiveCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function EvalsPage() {
  const [runs, setRuns] = useState<EvalRunResult[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/evals');
      const data = await res.json();
      setRuns(data);
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const selectedRun = runs.find((r) => r.id === selectedRunId) ?? null;

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <h1 className="mb-6 font-heading text-2xl text-foreground">Eval Results</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <h1 className="mb-6 font-heading text-2xl text-foreground">Eval Results</h1>
        <BlueprintCard>
          <p className="text-muted-foreground">
            No eval runs found. Run <code className="text-accent">npm run eval</code> to generate
            results.
          </p>
        </BlueprintCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">Eval Results</h1>
        <button onClick={fetchRuns} className="stamp-btn-secondary px-3 py-1 text-xs">
          Refresh
        </button>
      </div>

      {/* Run history table */}
      <BlueprintCard className="mb-6">
        <h2 className="mb-3 font-heading text-base text-foreground">Run History</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Mode</TableHead>
              <TableHead className="text-xs">Accuracy</TableHead>
              <TableHead className="text-xs">Problems</TableHead>
              <TableHead className="text-xs">Commit</TableHead>
              <TableHead className="text-xs">Duration</TableHead>
              <TableHead className="w-8 text-xs"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => (
              <TableRow
                key={run.id}
                className={`cursor-pointer ${selectedRunId === run.id ? 'bg-surface-2' : ''}`}
                onClick={() => setSelectedRunId(run.id)}
              >
                <TableCell className="text-foreground/80">{formatDate(run.timestamp)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {run.providerMode}
                  </Badge>
                  {run.comparison && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      comparison
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono text-foreground/80">
                  {pct(run.summary.overallAccuracy)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {run.summary.totalProblems}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {run.gitCommit ? run.gitCommit.slice(0, 7) : '-'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDuration(run.duration)}
                </TableCell>
                <TableCell className="text-accent">
                  {selectedRunId === run.id ? '>' : ''}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </BlueprintCard>

      {/* Selected run detail */}
      {selectedRun && (
        <>
          {/* Summary card */}
          <BlueprintCard className="mb-6">
            <h2 className="mb-3 font-heading text-base text-foreground">Run Summary</h2>
            <div className="flex flex-wrap items-start gap-6">
              <div>
                <div className="font-heading text-3xl text-accent">
                  {pct(selectedRun.summary.overallAccuracy)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedRun.summary.totalCorrect}/{selectedRun.summary.totalQuestions} correct
                </div>
              </div>
              {selectedRun.summary.zeroShot && (
                <div>
                  <div className="text-xs text-muted-foreground">Zero-shot</div>
                  <div className="font-mono text-lg text-foreground/80">
                    {pct(selectedRun.summary.zeroShot.overallAccuracy)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedRun.summary.zeroShot.totalCorrect}/{selectedRun.summary.totalQuestions}{' '}
                    correct
                  </div>
                </div>
              )}
              {selectedRun.summary.delta && (
                <div>
                  <div className="text-xs text-muted-foreground">Delta</div>
                  <div className="font-mono text-lg">
                    <DeltaValue value={selectedRun.summary.delta.overallAccuracy} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    accuracy (mean score:{' '}
                    <DeltaValue value={selectedRun.summary.delta.meanScore} />)
                  </div>
                </div>
              )}
              <div className="ml-auto text-right text-xs text-muted-foreground">
                <div>{formatDate(selectedRun.timestamp)}</div>
                <div>{selectedRun.providerMode} mode</div>
                <div>{formatDuration(selectedRun.duration)}</div>
                {selectedRun.gitCommit && (
                  <div className="font-mono">{selectedRun.gitCommit.slice(0, 7)}</div>
                )}
              </div>
            </div>
          </BlueprintCard>

          {/* Per-problem breakdown */}
          <BlueprintCard>
            <h2 className="mb-3 font-heading text-base text-foreground">
              Per-Problem Breakdown ({selectedRun.problems.length} problems)
            </h2>
            <div className="divide-y divide-border-subtle">
              {selectedRun.problems.map((problem) => (
                <ProblemBreakdown key={problem.problemId} problem={problem} />
              ))}
            </div>
          </BlueprintCard>
        </>
      )}
    </div>
  );
}
