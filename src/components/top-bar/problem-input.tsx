'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkflowStore } from '@/lib/workflow-store';

const EXAMPLE_PRESETS = [
  {
    label: 'Saisiyat',
    filename: 'uklo_2025R1P3_MoSy_Rosetta_Austr_Saisiyat_Input.md',
  },
  {
    label: 'Forest Enets',
    filename: 'onling_2024P1_MoSyPh_Rosetta_Uralic_Forest-Enets_Input.md',
  },
  {
    label: 'Okinawan',
    filename: 'onling_2024P3_MoSyPh_Rosetta_Japonic_Okinawan_Input.md',
  },
] as const;

export function ProblemInput() {
  const problemText = useWorkflowStore((s) => s.problemText);
  const runStatus = useWorkflowStore((s) => s.runStatus);
  const startRun = useWorkflowStore((s) => s.startRun);
  const stopRun = useWorkflowStore((s) => s.stopRun);
  const reset = useWorkflowStore((s) => s.reset);

  const hasLoaded = problemText.trim().length > 0;

  const [draft, setDraft] = useState(problemText);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Sync draft when store's problemText changes externally
  useEffect(() => {
    setDraft(problemText);
  }, [problemText]);

  const openDialog = useCallback(() => {
    setExpanded(true);
    dialogRef.current?.showModal();
  }, []);

  const closeDialog = useCallback(() => {
    setExpanded(false);
    dialogRef.current?.close();
  }, []);

  const loadPreset = useCallback(async (filename: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/examples/${filename}`);
      if (!res.ok) throw new Error('Failed to load example');
      const text = await res.text();
      setDraft(text);
    } catch (err) {
      console.error('Failed to load preset:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSolve = useCallback(() => {
    if (!draft.trim()) return;
    closeDialog();
    startRun(draft.trim());
  }, [draft, closeDialog, startRun]);

  const handleReset = useCallback(() => {
    stopRun();
    reset();
  }, [stopRun, reset]);

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {hasLoaded ? (
        <>
          <Button variant="outline" size="xs" onClick={openDialog}>
            View loaded problem
          </Button>
          <Button variant="ghost" size="xs" onClick={handleReset} title="Reset">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : (
        <Button variant="outline" size="xs" onClick={openDialog}>
          Upload problem
        </Button>
      )}

      {/* Expanded input dialog */}
      <dialog
        ref={dialogRef}
        onClose={() => setExpanded(false)}
        className="fixed inset-0 m-auto h-[70vh] w-[min(640px,90vw)] rounded-lg border
          bg-background p-0 shadow-lg backdrop:bg-black/40"
      >
        {expanded && (
          <div className="flex h-full flex-col p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">Problem Input</span>
              <Button variant="ghost" size="xs" onClick={closeDialog}>
                Close
              </Button>
            </div>

            {/* Preset buttons */}
            <div className="mb-2 flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Examples:</span>
              {EXAMPLE_PRESETS.map((preset) => (
                <Button
                  key={preset.filename}
                  variant="outline"
                  size="xs"
                  disabled={loading}
                  onClick={() => loadPreset(preset.filename)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={loading}
              placeholder="Paste a Linguistics Olympiad problem here..."
              className="flex-1 resize-none rounded-md border bg-muted/30 p-3 font-mono text-xs
                leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring
                disabled:opacity-50"
            />

            {/* Actions */}
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={closeDialog}>
                Cancel
              </Button>
              <Button size="sm" disabled={!draft.trim()} onClick={handleSolve}>
                Solve
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
