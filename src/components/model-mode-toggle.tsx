'use client';

import { Switch } from '@/components/ui/switch';
import { useModelMode } from '@/hooks/use-model-mode';

export function ModelModeToggle() {
  const [mode, setMode] = useModelMode();

  return (
    <div className="flex items-center gap-2 font-heading text-sm">
      <span className={mode === 'testing' ? 'text-accent' : 'text-muted-foreground'}>
        Testing ($)
      </span>
      <Switch
        checked={mode === 'production'}
        onCheckedChange={(checked) => setMode(checked ? 'production' : 'testing')}
      />
      <span className={mode === 'production' ? 'text-accent' : 'text-muted-foreground'}>
        Production ($$$)
      </span>
    </div>
  );
}
