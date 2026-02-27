'use client';

import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { SunIcon, MoonIcon, MonitorIcon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(next);
  };

  const Icon = theme === 'system' ? MonitorIcon : theme === 'light' ? SunIcon : MoonIcon;
  const label = theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark';

  return (
    <Button variant="ghost" size="sm" onClick={cycleTheme} className="gap-1.5">
      <Icon className="h-4 w-4" />
      <span className="text-xs text-muted-foreground">{label}</span>
    </Button>
  );
}
