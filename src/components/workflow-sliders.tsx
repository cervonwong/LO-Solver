'use client';

import { useWorkflowSettings } from '@/hooks/use-workflow-settings';

export function WorkflowSliders({ disabled }: { disabled?: boolean }) {
  const [settings, updateSettings] = useWorkflowSettings();

  return (
    <div
      className={`flex flex-col gap-0.5 font-heading text-sm${disabled ? ' opacity-50 pointer-events-none' : ''}`}
    >
      <div className="flex items-center gap-1.5">
        <label htmlFor="slider-rounds" className="text-foreground/80">
          Rounds
        </label>
        <input
          id="slider-rounds"
          type="range"
          min={1}
          max={5}
          step={1}
          value={settings.maxRounds}
          onChange={(e) => updateSettings({ maxRounds: Number(e.target.value) })}
          className="h-1 w-16 cursor-pointer appearance-none rounded bg-border accent-accent"
          disabled={disabled}
        />
        <span className="min-w-[1ch] text-center text-accent">{settings.maxRounds}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <label htmlFor="slider-perspectives" className="text-foreground/80">
          Perspectives
        </label>
        <input
          id="slider-perspectives"
          type="range"
          min={2}
          max={7}
          step={1}
          value={settings.perspectiveCount}
          onChange={(e) => updateSettings({ perspectiveCount: Number(e.target.value) })}
          className="h-1 w-16 cursor-pointer appearance-none rounded bg-border accent-accent"
          disabled={disabled}
        />
        <span className="min-w-[1ch] text-center text-accent">{settings.perspectiveCount}</span>
      </div>
    </div>
  );
}
