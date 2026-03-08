'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ExampleOption {
  id: string;
  label: string;
  type: string;
}

interface ProblemInputProps {
  examples: ExampleOption[];
  onSolve: (text: string) => void;
  disabled?: boolean | undefined;
  onTextChange?: (hasText: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
}

export function ProblemInput({
  examples,
  onSolve,
  disabled,
  onTextChange,
  value: problemText,
  onValueChange: setProblemText,
}: ProblemInputProps) {
  const [loading, setLoading] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [selectedExample, setSelectedExample] = useState('');

  async function handleExampleSelect(id: string) {
    setSelectedExample(id);
    setComboOpen(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/examples/${id}`);
      if (!res.ok) throw new Error('Failed to load example');
      const { text } = await res.json();
      setProblemText(text);
      onTextChange?.(!!text.trim());
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    const trimmed = problemText.trim();
    if (!trimmed) return;
    onSolve(trimmed);
  }

  // Group examples by type for sectioned display
  const grouped = examples.reduce<Record<string, ExampleOption[]>>((acc, ex) => {
    const group = ex.type || 'other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(ex);
    return acc;
  }, {});

  const groupLabels: Record<string, string> = {
    uklo: 'UKLO',
    onling: 'Onling',
    iol: 'IOL',
  };
  const groupOrder = ['uklo', 'onling', 'iol'];

  const isDisabled = disabled || loading;
  const hasContent = !!problemText.trim();

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <Textarea
          value={problemText}
          onChange={(e) => {
            setProblemText(e.target.value);
            onTextChange?.(!!e.target.value.trim());
          }}
          className="min-h-[200px] resize-y border-border bg-surface-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:shadow-[0_0_8px_rgba(0,255,255,0.2)]"
          disabled={isDisabled}
        />

        {/* Empty state overlay */}
        {!hasContent && !loading && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center font-heading">
            <p className="text-lg text-muted-foreground">
              Paste a linguistics olympiad problem here
            </p>
            <p className="mt-1 text-xs text-muted-foreground">or</p>
            <button
              type="button"
              onClick={() => setComboOpen(true)}
              disabled={isDisabled}
              className="pointer-events-auto mt-2 border border-border bg-surface-2 px-3 py-1.5 text-xs tracking-wider text-muted-foreground hover-hatch-cyan"
            >
              Choose from our examples
            </button>
          </div>
        )}

        {/* Clear button when textarea has content */}
        {hasContent && !isDisabled && (
          <button
            type="button"
            title="Clear input"
            onClick={() => {
              setProblemText('');
              setSelectedExample('');
              onTextChange?.(false);
            }}
            className="absolute right-2 top-2 z-10 border border-transparent p-1 text-muted-foreground hover:border-border hover-hatch-cyan"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="18"
              viewBox="0 -960 960 960"
              width="18"
              fill="currentColor"
            >
              <path d="M312.31-140q-29.92 0-51.12-21.19Q240-182.39 240-212.31V-720h-40v-40h160v-30.77h240V-760h160v40h-40v507.69q0 30.31-21 51.31T647.69-140H312.31ZM680-720H280v507.69q0 14.54 9.23 23.77 9.23 9.23 23.08 9.23h335.38q12.31 0 22.31-10t10-22.69V-720ZM376.16-280h40v-360h-40v360Zm167.68 0h40v-360h-40v360ZM280-720v540-540Z" />
            </svg>
          </button>
        )}

        {/* Invisible popover anchor positioned center of textarea */}
        <Popover open={comboOpen} onOpenChange={setComboOpen}>
          <PopoverTrigger asChild>
            <span className="absolute left-1/2 top-1/2" />
          </PopoverTrigger>
          <PopoverContent className="frosted w-[300px] border border-border p-0">
            <Command>
              <CommandInput placeholder="Search examples..." className="h-8 text-xs" />
              <CommandList>
                <CommandEmpty>No example found.</CommandEmpty>
                {groupOrder
                  .filter((g) => grouped[g]?.length)
                  .map((group) => (
                    <CommandGroup key={group} heading={groupLabels[group] || group}>
                      {grouped[group]!.map((ex) => (
                        <CommandItem
                          key={ex.id}
                          value={ex.label}
                          onSelect={() => handleExampleSelect(ex.id)}
                          className="text-xs"
                        >
                          <Check
                            className={cn(
                              'mr-2 h-3 w-3',
                              selectedExample === ex.id ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {ex.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Plotter loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center border border-border bg-background/80">
            <svg width="200" height="20" viewBox="0 0 200 20" className="text-foreground">
              <text
                x="100"
                y="15"
                textAnchor="middle"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                fontSize="14"
                className="animate-plotter"
              >
                Loading example...
              </text>
            </svg>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!problemText.trim() || isDisabled}
        className="stamp-btn-accent flex w-fit items-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="20"
          viewBox="0 -960 960 960"
          width="20"
          fill="currentColor"
        >
          <path d="M726.69-123.12q-5.46-2.11-10.69-7.34L516.62-329.08q-5.24-5.23-7.35-10.69-2.12-5.46-2.12-11.92t2.12-11.93q2.11-5.46 7.35-10.69l66.53-66.54q5.23-5.23 10.7-7.34 5.46-2.12 11.92-2.12t11.92 2.12q5.46 2.11 10.69 7.34l199.39 199.39q5.23 5.23 7.35 10.69 2.11 5.46 2.11 11.92 0 6.47-2.11 11.93-2.12 5.46-7.35 10.69l-66.54 65.77q-5.23 5.23-10.69 7.34-5.46 2.12-11.92 2.12-6.47 0-11.93-2.12Zm11.93-39.8 55.92-55.93L606-407.38l-55.92 55.92 188.54 188.54ZM208.35-123q-5.58-2.23-10.81-7.46L131.23-196q-5.23-5.23-7.46-10.81-2.23-5.57-2.23-12.04 0-6.46 2.23-12.3 2.23-5.85 7.46-11.08l205.85-205.85h83.46L451.46-479 281.85-648.62h-57l-101-101 85.3-85.3 101 101v57l169.62 169.61 120.61-120.61-73.76-73.77 45.23-45.23h-90.7l-16.46-15.7 113.54-113.53 15.69 15.69V-769l45.23-45.23 158.93 157.38q14.69 13.93 21.77 31.97 7.07 18.03 7.07 38.19 0 14.77-4.38 28.69-4.39 13.92-12.92 26.31l-81.93-81.93-56.77 56.77-42.77-42.77-180.07 180.08v84.77L243-130.46q-5.23 5.23-10.69 7.46-5.46 2.23-11.93 2.23-6.46 0-12.03-2.23Zm12.03-40.69 196.93-196.93v-55.92h-55.93L164.46-219.62l55.92 55.93Zm0 0-55.92-55.93 28.08 27.85 27.84 28.08Zm518.24.77 55.92-55.93-55.92 55.93Z" />
        </svg>
        {disabled ? 'Solving...' : 'Solve'}
      </button>
    </div>
  );
}
