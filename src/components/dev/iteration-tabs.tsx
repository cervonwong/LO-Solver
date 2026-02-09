'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface IterationTabsProps {
  iterations: number[];
  activeIteration: number;
  onSelect: (iteration: number) => void;
}

export function IterationTabs({ iterations, activeIteration, onSelect }: IterationTabsProps) {
  if (iterations.length === 0) return null;

  return (
    <Tabs
      value={String(activeIteration)}
      onValueChange={(val) => onSelect(Number(val))}
      className="w-full"
    >
      <TabsList>
        {iterations.map((iter) => (
          <TabsTrigger key={iter} value={String(iter)}>
            Iteration {iter}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
