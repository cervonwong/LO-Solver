'use client';

import { Streamdown } from 'streamdown';
import { code } from '@streamdown/code';
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
  rulesApplied?: string[];
}

interface Rule {
  title: string;
  description: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface ResultsPanelProps {
  output: Record<string, unknown>;
  rules?: Rule[];
  onRuleClick?: ((ruleTitle: string) => void) | undefined;
}

const CONFIDENCE_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  HIGH: 'outline',
  MEDIUM: 'secondary',
  LOW: 'destructive',
};

function SummaryBar({ answers }: { answers: Answer[] }) {
  const high = answers.filter((a) => a.confidence === 'HIGH').length;
  const medium = answers.filter((a) => a.confidence === 'MEDIUM').length;
  const low = answers.filter((a) => a.confidence === 'LOW').length;

  return (
    <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
      <span className="text-xs font-medium text-foreground">
        {answers.length} {answers.length === 1 ? 'answer' : 'answers'}
      </span>
      <div className="flex items-center gap-2">
        {high > 0 && (
          <Badge variant="outline" className="text-[10px]">
            {high} HIGH
          </Badge>
        )}
        {medium > 0 && (
          <Badge variant="secondary" className="text-[10px]">
            {medium} MEDIUM
          </Badge>
        )}
        {low > 0 && (
          <Badge variant="destructive" className="text-[10px]">
            {low} LOW
          </Badge>
        )}
      </div>
    </div>
  );
}

function RuleTag({
  ruleTitle,
  onClick,
}: {
  ruleTitle: string;
  onClick?: ((title: string) => void) | undefined;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(ruleTitle);
      }}
      className="hover-hatch-cyan inline-flex items-center gap-1 border border-border-subtle px-1.5 py-0.5 text-[10px] text-accent cursor-pointer"
      title={`View rule: ${ruleTitle}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height="10"
        viewBox="0 -960 960 960"
        width="10"
        fill="currentColor"
        className="shrink-0 opacity-60"
      >
        <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm80-80h400v-80H280v80Zm0-160h400v-80H280v80Zm0-160h400v-80H280v80Z" />
      </svg>
      {ruleTitle}
    </button>
  );
}

function AnswersSection({
  answers,
  onRuleClick,
}: {
  answers: Answer[];
  onRuleClick?: ((ruleTitle: string) => void) | undefined;
}) {
  return (
    <section>
      {answers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No answers generated.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <SummaryBar answers={answers} />
          {answers.map((a) => (
            <Collapsible key={a.questionId}>
              <CollapsibleTrigger className="hover-hatch-cyan flex w-full flex-col gap-1 border border-border-subtle px-3 py-2 text-left text-sm">
                <div className="flex w-full items-center justify-between">
                  <span>
                    <span className="font-bold">{a.questionId}:</span> {a.answer}
                  </span>
                  <Badge variant={CONFIDENCE_VARIANT[a.confidence]}>{a.confidence}</Badge>
                </div>
                {a.rulesApplied && a.rulesApplied.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {a.rulesApplied.map((rule) => (
                      <RuleTag key={rule} ruleTitle={rule} onClick={onRuleClick} />
                    ))}
                  </div>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="animate-collapsible border-x border-b border-border-subtle px-3 py-2 text-xs text-muted-foreground">
                <div className="mb-2 text-[11px] leading-4">
                  <Streamdown plugins={{ code }}>{a.workingSteps}</Streamdown>
                </div>
                <p className="italic border-t border-border-subtle pt-2">
                  {a.confidenceReasoning}
                </p>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}
    </section>
  );
}

export function ResultsPanel({ output, rules, onRuleClick }: ResultsPanelProps) {
  const answers = (output.answers as Answer[] | null) ?? [];

  return (
    <Tabs defaultValue="answers" className="w-full">
      <TabsList className="rounded-none border-b border-border bg-transparent">
        <TabsTrigger
          value="answers"
          className="rounded-none border-b-2 border-transparent text-xs uppercase tracking-wider data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-accent"
        >
          Answers
        </TabsTrigger>
        <TabsTrigger
          value="rules"
          className="rounded-none border-b-2 border-transparent text-xs uppercase tracking-wider data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-accent"
        >
          Rules
        </TabsTrigger>
      </TabsList>
      <TabsContent value="answers">
        <AnswersSection answers={answers} onRuleClick={onRuleClick} />
      </TabsContent>
      <TabsContent value="rules">
        {rules && rules.length > 0 && <RulesSection rules={rules} />}
      </TabsContent>
    </Tabs>
  );
}

function RulesSection({ rules }: { rules: Rule[] }) {
  return (
    <section>
      <div className="flex flex-col gap-2">
        {rules.map((r) => (
          <Collapsible key={r.title}>
            <CollapsibleTrigger className="hover-hatch-cyan flex w-full items-center justify-between border border-border-subtle px-3 py-2 text-left text-sm">
              <span>{r.title}</span>
              <Badge variant={CONFIDENCE_VARIANT[r.confidence]}>{r.confidence}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="animate-collapsible border-x border-b border-border-subtle px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap">
              {r.description}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </section>
  );
}
