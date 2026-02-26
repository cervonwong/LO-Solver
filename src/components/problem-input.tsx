'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface ExampleOption {
  id: string;
  label: string;
}

interface ProblemInputProps {
  examples: ExampleOption[];
  onSolve: (text: string) => void;
  disabled?: boolean | undefined;
}

export function ProblemInput({ examples, onSolve, disabled }: ProblemInputProps) {
  const [problemText, setProblemText] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleExampleSelect(id: string) {
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

  const isDisabled = disabled || loading;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor="example-select" className="text-sm text-muted-foreground">
          Load example:
        </label>
        <select
          id="example-select"
          className="rounded border border-input bg-background px-2 py-1 text-sm"
          defaultValue=""
          disabled={isDisabled}
          onChange={(e) => {
            if (e.target.value) handleExampleSelect(e.target.value);
          }}
        >
          <option value="" disabled>
            Select a problem...
          </option>
          {examples.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.label}
            </option>
          ))}
        </select>
      </div>

      <Textarea
        value={problemText}
        onChange={(e) => setProblemText(e.target.value)}
        placeholder="Paste a linguistics problem here..."
        className="min-h-[200px] resize-y font-mono text-sm"
        disabled={isDisabled}
      />

      <Button onClick={handleSubmit} disabled={!problemText.trim() || isDisabled} className="w-fit">
        {disabled ? 'Solving...' : 'Solve'}
      </Button>
    </div>
  );
}
