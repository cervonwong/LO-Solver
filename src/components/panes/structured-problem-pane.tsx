'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
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

export function StructuredProblemPane() {
  const structuredProblem = useWorkflowStore((s) => s.structuredProblem);
  const openPane = useWorkflowStore((s) => s.openPane);
  const setOpenPane = useWorkflowStore((s) => s.setOpenPane);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (openPane === 'problem') {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [openPane]);

  return (
    <dialog
      ref={dialogRef}
      onClose={() => setOpenPane(null)}
      className="fixed inset-0 m-auto h-[70vh] w-[min(640px,90vw)] rounded-lg border
        bg-background p-0 shadow-lg backdrop:bg-black/40"
    >
      <div className="flex h-full flex-col p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium">Structured Problem</span>
          <Button variant="ghost" size="xs" onClick={() => setOpenPane(null)}>
            Close
          </Button>
        </div>

        {structuredProblem === null ? (
          <p className="text-xs text-muted-foreground">Waiting for extraction to complete...</p>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-3">
              {/* Context */}
              <section>
                <h3 className="mb-1 text-xs font-semibold text-muted-foreground uppercase">
                  Context
                </h3>
                <p className="text-xs leading-relaxed">{structuredProblem.context}</p>
              </section>

              {/* Dataset */}
              <section>
                <h3 className="mb-1 text-xs font-semibold text-muted-foreground uppercase">
                  Dataset
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Source</TableHead>
                      <TableHead className="text-[10px]">Target</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {structuredProblem.dataset.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{row.source}</TableCell>
                        <TableCell className="text-xs">{row.target}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </section>

              {/* Questions */}
              <section>
                <h3 className="mb-1 text-xs font-semibold text-muted-foreground uppercase">
                  Questions
                </h3>
                <ol className="list-decimal space-y-1 pl-4">
                  {structuredProblem.questions.map((q) => (
                    <li key={q.id} className="text-xs">
                      {q.text}
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </ScrollArea>
        )}
      </div>
    </dialog>
  );
}
