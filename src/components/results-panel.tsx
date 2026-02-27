'use client';

import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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

interface ResultsPanelProps {
  output: Record<string, unknown>;
  rules?: Rule[];
}

const CONFIDENCE_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  HIGH: 'default',
  MEDIUM: 'secondary',
  LOW: 'outline',
};

export function ResultsPanel({ output, rules }: ResultsPanelProps) {
  const answers = (output.answers as Answer[] | null) ?? [];

  return (
    <Tabs defaultValue="answers" className="w-full">
      <TabsList>
        <TabsTrigger value="answers">Answers</TabsTrigger>
        <TabsTrigger value="rules">Rules</TabsTrigger>
      </TabsList>
      <TabsContent value="answers">
        <AnswersSection answers={answers} />
      </TabsContent>
      <TabsContent value="rules">
        {rules && rules.length > 0 && <RulesSection rules={rules} />}
      </TabsContent>
    </Tabs>
  );
}

function AnswersSection({ answers }: { answers: Answer[] }) {
  return (
    <section>
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
              <CollapsibleContent className="animate-collapsible border-x border-b border-border px-3 py-2 text-xs text-muted-foreground">
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
      <div className="flex flex-col gap-2">
        {rules.map((r) => (
          <Collapsible key={r.title}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded border border-border px-3 py-2 text-left text-sm hover:bg-accent">
              <span>{r.title}</span>
              <Badge variant={CONFIDENCE_VARIANT[r.confidence]}>{r.confidence}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="animate-collapsible border-x border-b border-border px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap">
              {r.description}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </section>
  );
}
