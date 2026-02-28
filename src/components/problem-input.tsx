'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
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
}

export function ProblemInput({ examples, onSolve, disabled }: ProblemInputProps) {
  const [problemText, setProblemText] = useState('');
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Load example:</span>
        <Popover open={comboOpen} onOpenChange={setComboOpen}>
          <PopoverTrigger asChild>
            <button
              role="combobox"
              aria-expanded={comboOpen}
              disabled={isDisabled}
              className="flex h-8 items-center justify-between gap-1 border border-border bg-surface-2 px-2 text-xs text-foreground hover:bg-surface-3 disabled:opacity-50"
            >
              {selectedExample
                ? examples.find((ex) => ex.id === selectedExample)?.label ?? 'Select...'
                : 'Select a problem...'}
              <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
            </button>
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
      </div>

      <div className="relative">
        <Textarea
          value={problemText}
          onChange={(e) => setProblemText(e.target.value)}
          placeholder="Paste a linguistics problem here..."
          className="min-h-[200px] resize-y border-border bg-surface-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:shadow-[0_0_8px_rgba(0,255,255,0.2)]"
          disabled={isDisabled}
        />
        {/* Plotter loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center border border-border bg-background/80">
            <svg width="200" height="20" viewBox="0 0 200 20" className="text-foreground">
              <text
                x="0"
                y="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                fontSize="14"
                className="animate-plotter"
              >
                LOADING SCHEMATIC...
              </text>
            </svg>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!problemText.trim() || isDisabled}
        className="stamp-btn w-fit"
      >
        {disabled ? 'Solving...' : 'Solve'}
      </button>
    </div>
  );
}
