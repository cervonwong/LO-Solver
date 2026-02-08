'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WorkflowResult {
  success: boolean;
  explanation: string;
  answers: Array<{
    questionId: string;
    answer: string;
    workingSteps: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    confidenceReasoning: string;
  }> | null;
}

interface Rule {
  title: string;
  description: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface VocabularyEntry {
  foreignForm: string;
  meaning: string;
  type: string;
  notes?: string;
}

export interface ResultsPanelProps {
  result: WorkflowResult | null;
  rules: Rule[];
  vocabulary: VocabularyEntry[];
}

const confidenceBadgeVariant = (confidence: 'HIGH' | 'MEDIUM' | 'LOW') => {
  switch (confidence) {
    case 'HIGH':
      return 'default' as const;
    case 'MEDIUM':
      return 'secondary' as const;
    case 'LOW':
      return 'destructive' as const;
  }
};

export function ResultsPanel({ result, rules, vocabulary }: ResultsPanelProps) {
  if (!result) return null;

  if (!result.success) {
    return (
      <div className="mt-6 rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm font-medium text-destructive">Pipeline failed</p>
        <p className="mt-1 text-sm text-destructive/80">{result.explanation}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-8">
      {/* Answers section */}
      {result.answers && result.answers.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Answers</h2>
          <div className="space-y-2">
            {result.answers.map((answer) => (
              <AnswerItem key={answer.questionId} answer={answer} />
            ))}
          </div>
        </section>
      )}

      {/* Rules section */}
      {rules.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Rules ({rules.length})</h2>
          <div className="space-y-2">
            {rules.map((rule, i) => (
              <RuleItem key={i} rule={rule} />
            ))}
          </div>
        </section>
      )}

      {/* Vocabulary section */}
      {vocabulary.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">
            Vocabulary ({vocabulary.length} {vocabulary.length === 1 ? 'entry' : 'entries'})
          </h2>
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Foreign Form</TableHead>
                  <TableHead>Meaning</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vocabulary.map((entry, i) => (
                  <TableRow key={i} className="even:bg-muted/50">
                    <TableCell className="font-medium">{entry.foreignForm}</TableCell>
                    <TableCell>{entry.meaning}</TableCell>
                    <TableCell>{entry.type}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.notes ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </section>
      )}
    </div>
  );
}

function AnswerItem({ answer }: { answer: NonNullable<WorkflowResult['answers']>[number] }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border p-3">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 text-left">
            <span className="text-xs text-muted-foreground">{open ? '\u25BE' : '\u25B8'}</span>
            <span className="shrink-0 text-sm font-semibold text-muted-foreground">
              {answer.questionId}
            </span>
            <span className="min-w-0 flex-1 text-sm">{answer.answer}</span>
            <Badge variant={confidenceBadgeVariant(answer.confidence)}>{answer.confidence}</Badge>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 space-y-2 border-t pt-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Working steps</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{answer.workingSteps}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Confidence reasoning</p>
              <p className="mt-1 text-sm">{answer.confidenceReasoning}</p>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function RuleItem({ rule }: { rule: Rule }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border p-3">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 text-left">
            <span className="text-xs text-muted-foreground">{open ? '\u25BE' : '\u25B8'}</span>
            <span className="min-w-0 flex-1 text-sm font-medium">{rule.title}</span>
            <Badge variant={confidenceBadgeVariant(rule.confidence)}>{rule.confidence}</Badge>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <p className="mt-3 whitespace-pre-wrap border-t pt-3 text-sm">{rule.description}</p>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
