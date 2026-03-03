'use client';

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

interface VocabEntry {
  foreignForm: string;
  meaning: string;
  type?: string;
  notes?: string;
}

interface VocabularyPanelProps {
  vocabulary: VocabEntry[];
  activityEvents: ActivityEvent[];
  isRunning: boolean;
}

export function VocabularyPanel({ vocabulary, activityEvents, isRunning }: VocabularyPanelProps) {
  return (
    <div className="frosted flex h-full min-h-[120px] flex-col">
      <div className="panel-heading flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="16"
            viewBox="0 -960 960 960"
            width="16"
            fill="currentColor"
            className="shrink-0"
          >
            <path d="M175.38-396.38h31.16l22.23-61.39h114.77L366-396.38h31.69l-92.38-245.7H267l-91.62 245.7Zm64.85-90.7 44.92-122.38h2l44.93 122.38h-91.85ZM260-318.46q52.38 0 101.88 12.04 49.5 12.04 98.12 39.19v-392.46q-43.31-30.93-95.46-46.39-52.16-15.46-104.54-15.46-39.85 0-76.12 6.62-36.26 6.61-63.88 22.15v399.85q28.08-12 66.04-18.77 37.96-6.77 73.96-6.77Zm240 51.23q48.62-27.15 98.12-39.19 49.5-12.04 101.88-12.04 36 0 73.96 6.77 37.96 6.77 66.04 18.77v-399.85q-27.62-15.54-63.88-22.15-36.27-6.62-76.12-6.62-52.38 0-104.54 15.46-52.15 15.46-95.46 46.39v392.46Zm-20 58q-48.77-33.39-104.77-51.31-56-17.92-115.23-17.92-49.15 0-96.77 13.84Q115.62-250.77 80-228v-489.23q34-20.77 81.58-32.54 47.57-11.77 98.42-11.77 58.77 0 114.65 16.92 55.89 16.93 105.35 49.24 49.46-32.31 105.35-49.24 55.88-16.92 114.65-16.92 50.85 0 98.04 11.77Q845.23-738 880-717.23V-228q-35.38-22.77-83.12-36.62-47.73-13.84-96.88-13.84-59.23 0-115.23 17.92-56 17.92-104.77 51.31ZM290-494.38Zm265.38-81.93v-37.23q32.24-16.31 69.04-24.46 36.81-8.15 75.58-8.15 22.15 0 42.54 2.84 20.38 2.85 42.08 8.08v36.31q-20.93-6.7-40.81-9.27-19.89-2.58-43.81-2.58-38.77 0-75.69 8.73-36.93 8.73-68.93 25.73Zm0 218.46v-38.77q30.7-16.3 68.66-24.46 37.96-8.15 75.96-8.15 22.15 0 42.54 2.85 20.38 2.84 42.08 8.07V-382q-20.93-6.69-40.81-9.27-19.89-2.58-43.81-2.58-38.77 0-75.69 9.39-36.93 9.38-68.93 26.61Zm0-108.46v-38.77q32.24-16.3 69.04-24.46 36.81-8.15 75.58-8.15 22.15 0 42.54 2.84 20.38 2.85 42.08 8.08v36.31q-20.93-6.69-40.81-9.27-19.89-2.58-43.81-2.58-38.77 0-75.69 9.5-36.93 9.5-68.93 26.5Z" />
          </svg>
          <h3 className="font-heading text-sm text-foreground">Vocabulary</h3>
          <span className="dimension">
            {vocabulary.length} {vocabulary.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        <RollingActivityChips events={activityEvents} />
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {vocabulary.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted-foreground opacity-50">
            {isRunning
              ? 'Vocabulary entries will appear here as the solver discovers them...'
              : 'No vocabulary entries yet.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Form
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Meaning
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Type
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Notes
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vocabulary.map((entry) => (
                <TableRow key={entry.foreignForm} className="animate-slide-in-row">
                  <TableCell className="text-sm">{entry.foreignForm}</TableCell>
                  <TableCell className="text-sm">{entry.meaning}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.type ?? '\u2014'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.notes ?? '\u2014'}
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
