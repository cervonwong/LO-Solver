'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useWorkflowStore } from '@/lib/workflow-store';

const STATUS_STYLES: Record<string, string> = {
  passing: 'bg-green-500/15 text-green-700 dark:text-green-400',
  failing: 'bg-red-500/15 text-red-700 dark:text-red-400',
  untested: 'bg-muted text-muted-foreground',
};

export function ResultsPane() {
  const results = useWorkflowStore((s) => s.results);
  const openPane = useWorkflowStore((s) => s.openPane);
  const setOpenPane = useWorkflowStore((s) => s.setOpenPane);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (openPane === 'results') {
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
          <span className="text-sm font-medium">Solution</span>
          <Button variant="ghost" size="xs" onClick={() => setOpenPane(null)}>
            Close
          </Button>
        </div>

        {results === null ? (
          <p className="text-xs text-muted-foreground">Waiting for answers...</p>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-3">
              {/* Answers */}
              <section>
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                  Answers
                </h3>
                <div className="space-y-2">
                  {results.answers.map((a) => (
                    <div key={a.questionId} className="rounded-md border p-2">
                      <p className="text-[10px] text-muted-foreground">{a.questionText}</p>
                      <p className="mt-1 text-xs font-medium">{a.answer}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Rules */}
              <section>
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                  Rules
                </h3>
                <div className="space-y-1.5">
                  {results.rules.map((rule) => (
                    <div key={rule.id} className="flex items-start gap-2">
                      <Badge
                        variant="outline"
                        className={cn('mt-0.5 shrink-0 text-[10px]', STATUS_STYLES[rule.status])}
                      >
                        {rule.status}
                      </Badge>
                      <span className="text-xs">{rule.description}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </ScrollArea>
        )}
      </div>
    </dialog>
  );
}
