'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ellipsis, Sun, Moon, Monitor, Square, FileText, BookOpen, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkflowStore } from '@/lib/workflow-store';
import { useWorkflowStreamContext } from '@/lib/workflow-stream-context';

type Theme = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'lo-solver-theme';

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <Sun className="mr-2 h-4 w-4" /> },
  { value: 'dark', label: 'Dark', icon: <Moon className="mr-2 h-4 w-4" /> },
  { value: 'system', label: 'System', icon: <Monitor className="mr-2 h-4 w-4" /> },
];

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

export function TopBarActions() {
  const runStatus = useWorkflowStore((s) => s.runStatus);
  const stopRun = useWorkflowStore((s) => s.stopRun);
  const { stop: stopStream } = useWorkflowStreamContext();
  const structuredProblem = useWorkflowStore((s) => s.structuredProblem);
  const vocabulary = useWorkflowStore((s) => s.vocabulary);
  const results = useWorkflowStore((s) => s.results);
  const openPane = useWorkflowStore((s) => s.openPane);
  const setOpenPane = useWorkflowStore((s) => s.setOpenPane);

  const [theme, setTheme] = useState<Theme>('system');

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const handleThemeChange = useCallback((value: string) => {
    const next = value as Theme;
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }, []);

  return (
    <div className="flex items-center gap-1.5">
      {/* Pane toggle buttons */}
      {structuredProblem !== null && (
        <Button
          variant={openPane === 'problem' ? 'default' : 'outline'}
          size="xs"
          onClick={() => setOpenPane(openPane === 'problem' ? null : 'problem')}
        >
          <FileText className="mr-1 h-3 w-3" />
          Problem
        </Button>
      )}
      {vocabulary.size > 0 && (
        <Button
          variant={openPane === 'vocabulary' ? 'default' : 'outline'}
          size="xs"
          onClick={() => setOpenPane(openPane === 'vocabulary' ? null : 'vocabulary')}
        >
          <BookOpen className="mr-1 h-3 w-3" />
          Vocab
        </Button>
      )}
      {(results !== null || runStatus === 'complete') && (
        <Button
          variant={openPane === 'results' ? 'default' : 'outline'}
          size="xs"
          onClick={() => setOpenPane(openPane === 'results' ? null : 'results')}
        >
          <Trophy className="mr-1 h-3 w-3" />
          Results
        </Button>
      )}

      {/* Stop button (visible only when running) */}
      {runStatus === 'running' && (
        <Button variant="destructive" size="xs" onClick={() => { stopStream(); stopRun(); }}>
          <Square className="mr-1 h-3 w-3 fill-current" />
          Stop
        </Button>
      )}

      {/* Three-dot menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="xs">
            <Ellipsis className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={theme} onValueChange={handleThemeChange}>
            {THEME_OPTIONS.map((opt) => (
              <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                <span className="flex items-center">
                  {opt.icon}
                  {opt.label}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
