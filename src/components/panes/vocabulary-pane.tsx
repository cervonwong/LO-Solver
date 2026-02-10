'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkflowStore } from '@/lib/workflow-store';

export function VocabularyPane() {
  const vocabulary = useWorkflowStore((s) => s.vocabulary);
  const openPane = useWorkflowStore((s) => s.openPane);
  const setOpenPane = useWorkflowStore((s) => s.setOpenPane);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (openPane === 'vocabulary') {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [openPane]);

  const entries = Array.from(vocabulary.values());

  return (
    <dialog
      ref={dialogRef}
      onClose={() => setOpenPane(null)}
      className="fixed inset-0 m-auto h-[70vh] w-[min(640px,90vw)] rounded-lg border
        bg-background p-0 shadow-lg backdrop:bg-black/40"
    >
      <div className="flex h-full flex-col p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Vocabulary</span>
            <Badge variant="secondary" className="text-[10px]">
              {entries.length}
            </Badge>
          </div>
          <Button variant="ghost" size="xs" onClick={() => setOpenPane(null)}>
            Close
          </Button>
        </div>

        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">No vocabulary entries yet</p>
        ) : (
          <ScrollArea className="flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Foreign Form</TableHead>
                  <TableHead className="text-[10px]">Meaning</TableHead>
                  <TableHead className="text-[10px]">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.foreignForm}>
                    <TableCell className="text-xs font-mono">{entry.foreignForm}</TableCell>
                    <TableCell className="text-xs">{entry.meaning}</TableCell>
                    <TableCell className="text-xs">{entry.type}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>
    </dialog>
  );
}
