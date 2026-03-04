'use client';

import { useMemo } from 'react';
import type { ActivityEvent } from '@/components/rolling-activity-chips';
import type {
  WorkflowTraceEvent,
  RulesUpdateEvent,
  RuleTestResultEvent,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useWorkflowData(allParts: any[]) {
  // Extract the latest workflow data part
  const workflowParts = allParts.filter(
    (p) => 'type' in p && p.type === 'data-workflow',
  ) as Array<{ type: string; data: WorkflowData }>;
  const workflowData = workflowParts.at(-1)?.data;
  const workflowStatus = workflowData?.status;
  const steps = workflowData?.steps ?? {};

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

  return {
    steps,
    workflowStatus,
    answerStepOutput,
    finalRules,
    vocabulary,
    rules,
    rulesWithTestStatus,
    vocabActivityEvents,
    rulesActivityEvents,
    traceEvents,
  };
}
