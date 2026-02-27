'use client';

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

interface VocabEntry {
  foreignForm: string;
  meaning: string;
  type?: string;
  notes?: string;
}

interface MutationSummary {
  added: number;
  updated: number;
  removed: number;
}

interface VocabularyPanelProps {
  vocabulary: VocabEntry[];
  mutationSummary: MutationSummary;
  isRunning: boolean;
}

export function VocabularyPanel({ vocabulary, mutationSummary, isRunning }: VocabularyPanelProps) {
  const hasActivity =
    mutationSummary.added > 0 || mutationSummary.updated > 0 || mutationSummary.removed > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Vocabulary</h3>
          <Badge variant="secondary" className="text-xs">
            {vocabulary.length} {vocabulary.length === 1 ? 'entry' : 'entries'}
          </Badge>
        </div>
        {hasActivity && (
          <div className="flex items-center gap-1.5">
            {mutationSummary.added > 0 && (
              <Badge className="bg-status-success-muted text-status-success text-xs">
                +{mutationSummary.added} added
              </Badge>
            )}
            {mutationSummary.updated > 0 && (
              <Badge className="bg-status-warning-muted text-status-warning text-xs">
                {mutationSummary.updated} updated
              </Badge>
            )}
            {mutationSummary.removed > 0 && (
              <Badge className="bg-destructive/10 text-destructive text-xs">
                {mutationSummary.removed} removed
              </Badge>
            )}
          </div>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {vocabulary.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            {isRunning
              ? 'Vocabulary entries will appear here as the solver discovers them...'
              : 'No vocabulary entries yet.'}
          </div>
        ) : (
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
              {vocabulary.map((entry) => (
                <TableRow key={entry.foreignForm} className="animate-slide-in-row">
                  <TableCell className="font-mono text-sm">{entry.foreignForm}</TableCell>
                  <TableCell className="text-sm">{entry.meaning}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.type ?? '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.notes ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </div>
  );
}
