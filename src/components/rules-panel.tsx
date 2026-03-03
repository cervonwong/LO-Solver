'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RollingActivityChips, type ActivityEvent } from '@/components/rolling-activity-chips';

export interface RuleEntry {
  title: string;
  description: string;
  confidence?: string;
  testStatus?: 'pass' | 'fail' | 'untested';
}

interface RulesPanelProps {
  rules: RuleEntry[];
  activityEvents: ActivityEvent[];
  isRunning: boolean;
}

const CONFIDENCE_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  HIGH: 'outline',
  MEDIUM: 'secondary',
  LOW: 'destructive',
};

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '...';
}

function TestStatusIcon({ status }: { status: 'pass' | 'fail' | 'untested' | undefined }) {
  if (status === 'pass') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-status-success"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (status === 'fail') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-destructive"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  return <span className="text-muted-foreground">&mdash;</span>;
}

export function RulesPanel({ rules, activityEvents, isRunning }: RulesPanelProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (title: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  return (
    <div className="frosted flex h-full min-h-[120px] flex-col">
      <div className="panel-heading flex shrink-0 items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="16"
            viewBox="0 -960 960 960"
            width="16"
            fill="currentColor"
            className="shrink-0"
          >
            <path d="M293.85-298.46h61.53V-360h-61.53v61.54Zm0-150.77h61.53v-61.54h-61.53v61.54Zm0-150.77h61.53v-61.54h-61.53V-600Zm153.84 290.77h215.39v-40H447.69v40Zm0-150.77h215.39v-40H447.69v40Zm0-150.77h215.39v-40H447.69v40ZM160-160v-640h640v640H160Zm40-40h560v-560H200v560Zm0 0v-560 560Z" />
          </svg>
          <h3 className="font-heading text-sm text-foreground">Rules</h3>
          <span className="dimension">
            {rules.length} {rules.length === 1 ? 'rule' : 'rules'}
          </span>
        </div>
        <RollingActivityChips events={activityEvents} />
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {rules.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted-foreground opacity-50">
            {isRunning
              ? 'Rules will appear here as the solver generates them...'
              : 'No rules yet.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-xs uppercase tracking-wider text-muted-foreground">
                  #
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Title
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Description
                </TableHead>
                <TableHead className="w-20 text-xs uppercase tracking-wider text-muted-foreground">
                  Confidence
                </TableHead>
                <TableHead className="w-14 text-xs uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule, index) => {
                const isExpanded = expandedRows.has(rule.title);
                const confidenceUpper = rule.confidence?.toUpperCase() ?? '';
                const variant = CONFIDENCE_VARIANT[confidenceUpper] ?? 'secondary';

                return (
                  <TableRow
                    key={rule.title}
                    data-rule-title={rule.title}
                    className="animate-slide-in-row cursor-pointer select-none transition-all"
                    onClick={() => toggleRow(rule.title)}
                  >
                    <TableCell className="align-top text-xs text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      <div className="flex items-center gap-1.5">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                        {rule.title}
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-xs text-muted-foreground">
                      {isExpanded ? (
                        <span className="whitespace-pre-wrap">{rule.description}</span>
                      ) : (
                        truncate(rule.description, 60)
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      {rule.confidence && (
                        <Badge variant={variant} className="text-xs">
                          {rule.confidence.toUpperCase()}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <TestStatusIcon status={rule.testStatus} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </div>
  );
}
