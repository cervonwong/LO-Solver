'use client';

import { Switch } from '@/components/ui/switch';
import { useModelMode } from '@/hooks/use-model-mode';

export function ModelModeToggle({ disabled }: { disabled?: boolean }) {
  const [mode, setMode] = useModelMode();

  return (
    <div
      className={`flex items-center gap-2 font-heading text-sm${disabled ? ' opacity-50 pointer-events-none' : ''}`}
    >
      <span className={mode === 'testing' ? 'text-accent' : 'text-muted-foreground'}>
        Testing ($)
      </span>
      <Switch
        checked={mode === 'production'}
        onCheckedChange={(checked) => setMode(checked ? 'production' : 'testing')}
        disabled={disabled}
      />
      <span className={mode === 'production' ? 'text-accent' : 'text-muted-foreground'}>
        Production ($$$)
      </span>
    </div>
  );
}
