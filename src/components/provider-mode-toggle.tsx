'use client';

import { toast } from 'sonner';
import { useProviderMode, isClaudeCodeMode } from '@/hooks/use-provider-mode';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type ProviderMode =
  | 'openrouter-testing'
  | 'openrouter-production'
  | 'claude-code-testing'
  | 'claude-code-production';

const OPTIONS: { value: ProviderMode; label: string }[] = [
  { value: 'openrouter-testing', label: 'OR Test' },
  { value: 'openrouter-production', label: 'OR Prod' },
  { value: 'claude-code-testing', label: 'CC Test' },
  { value: 'claude-code-production', label: 'CC Prod' },
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
          if (v) {
            const newMode = v as ProviderMode;
            setMode(newMode);
            const option = OPTIONS.find((o) => o.value === newMode);
            if (option) {
              const message = isClaudeCodeMode(newMode)
                ? `Switched to ${option.label}. Checking authentication...`
                : `Switched to ${option.label}`;
              toast(message);
            }
          }
        }}
        disabled={disabled ?? false}
        className="gap-0 border border-border"
      >
        {OPTIONS.map(({ value, label }) => (
          <ToggleGroupItem
            key={value}
            value={value}
            className={`rounded-none border-none bg-transparent px-2.5 py-0 font-heading text-xs text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground data-[state=on]:bg-transparent data-[state=on]:text-accent data-[state=on]:shadow-none [&:not(:first-child)]:border-l [&:not(:first-child)]:border-border${mode === value ? ' hover-hatch-active' : ' hover-hatch-cyan'}`}
          >
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
