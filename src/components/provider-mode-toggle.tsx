'use client';

import { useProviderMode } from '@/hooks/use-provider-mode';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type ProviderMode = 'openrouter-testing' | 'openrouter-production' | 'claude-code';

const OPTIONS: { value: ProviderMode; label: string }[] = [
  { value: 'openrouter-testing', label: 'Testing ($)' },
  { value: 'openrouter-production', label: 'Production ($$$)' },
  { value: 'claude-code', label: 'Claude Code' },
];

export function ProviderModeToggle({ disabled }: { disabled?: boolean }) {
  const [mode, setMode] = useProviderMode();

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Select Provider
      </span>
      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={(v) => {
          if (v) setMode(v as ProviderMode);
        }}
        disabled={disabled ?? false}
        className="gap-0 border border-border"
      >
        {OPTIONS.map(({ value, label }) => (
          <ToggleGroupItem
            key={value}
            value={value}
            className={`rounded-none border-none bg-transparent px-3 py-0.5 font-heading text-sm text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground data-[state=on]:bg-transparent data-[state=on]:text-accent data-[state=on]:shadow-none [&:not(:first-child)]:border-l [&:not(:first-child)]:border-border${mode === value ? ' hover-hatch-active' : ' hover-hatch-cyan'}`}
          >
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
