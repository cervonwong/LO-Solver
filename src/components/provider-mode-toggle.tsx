'use client';

import { useProviderMode } from '@/hooks/use-provider-mode';

type ProviderMode = 'openrouter-testing' | 'openrouter-production' | 'claude-code';

const OPTIONS: { value: ProviderMode; label: string }[] = [
  { value: 'openrouter-testing', label: 'Testing ($)' },
  { value: 'openrouter-production', label: 'Production ($$$)' },
  { value: 'claude-code', label: 'Claude Code' },
];

export function ProviderModeToggle({ disabled }: { disabled?: boolean }) {
  const [mode, setMode] = useProviderMode();

  return (
    <div
      className={`flex items-center gap-1 font-heading text-sm${disabled ? ' opacity-50 pointer-events-none' : ''}`}
    >
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          disabled={disabled}
          onClick={() => setMode(value)}
          className={`px-2 py-0.5 transition-colors ${
            mode === value ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
