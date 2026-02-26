'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Answer {
  questionId: string;
  answer: string;
  workingSteps: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceReasoning: string;
}

interface Rule {
  title: string;
  description: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface VocabEntry {
  foreignForm: string;
  meaning: string;
  type: string;
  notes: string;
}

interface ResultsPanelProps {
  output: Record<string, unknown>;
  rules?: Rule[];
  vocabulary?: VocabEntry[];
}

const CONFIDENCE_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  HIGH: 'default',
  MEDIUM: 'secondary',
  LOW: 'outline',
};

export function ResultsPanel({ output, rules, vocabulary }: ResultsPanelProps) {
  const answers = (output.answers as Answer[] | null) ?? [];

  return (
    <div className="flex w-full flex-col gap-6">
      <AnswersSection answers={answers} />
      {rules && rules.length > 0 && <RulesSection rules={rules} />}
      {vocabulary && vocabulary.length > 0 && <VocabularySection vocabulary={vocabulary} />}
    </div>
  );
}

function AnswersSection({ answers }: { answers: Answer[] }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">Answers</h2>
      {answers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No answers generated.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {answers.map((a) => (
            <Collapsible key={a.questionId}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded border border-border px-3 py-2 text-left text-sm hover:bg-accent">
                <span>
                  <span className="font-bold">{a.questionId}:</span> {a.answer}
                </span>
                <Badge variant={CONFIDENCE_VARIANT[a.confidence]}>{a.confidence}</Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="border-x border-b border-border px-3 py-2 text-xs text-muted-foreground">
                <p className="mb-1 whitespace-pre-wrap">{a.workingSteps}</p>
                <p className="italic">{a.confidenceReasoning}</p>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}
    </section>
  );
}

function RulesSection({ rules }: { rules: Rule[] }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">Rules ({rules.length})</h2>
      <div className="flex flex-col gap-2">
        {rules.map((r) => (
          <Collapsible key={r.title}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded border border-border px-3 py-2 text-left text-sm hover:bg-accent">
              <span>{r.title}</span>
              <Badge variant={CONFIDENCE_VARIANT[r.confidence]}>{r.confidence}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-x border-b border-border px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap">
              {r.description}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </section>
  );
}

function VocabularySection({ vocabulary }: { vocabulary: VocabEntry[] }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? vocabulary : vocabulary.slice(0, 20);

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">Vocabulary ({vocabulary.length} entries)</h2>
      <div className="rounded border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Form</TableHead>
              <TableHead className="text-xs">Meaning</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.map((v) => (
              <TableRow key={v.foreignForm}>
                <TableCell className="font-mono text-xs">{v.foreignForm}</TableCell>
                <TableCell className="text-xs">{v.meaning}</TableCell>
                <TableCell className="text-xs">{v.type}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{v.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {vocabulary.length > 20 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-2 text-xs text-muted-foreground underline hover:text-foreground"
        >
          Show all {vocabulary.length} entries
        </button>
      )}
    </section>
  );
}
