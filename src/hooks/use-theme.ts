'use client';

import { useCallback, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'lo-solver-theme';
const DEFAULT_THEME: Theme = 'system';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return DEFAULT_THEME;
}

function getResolvedTheme(): ResolvedTheme {
  const theme = getStoredTheme();
  return theme === 'system' ? getSystemTheme() : theme;
}

function applyTheme(): void {
  const resolved = getResolvedTheme();
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

// Snapshot encodes both raw preference and resolved theme so React re-renders
// when either changes (e.g. switching between "light" and "system" that both
// resolve to light).
function getSnapshot(): string {
  return `${getStoredTheme()}:${getResolvedTheme()}`;
}

function getServerSnapshot(): string {
  return `${DEFAULT_THEME}:light`;
}

function subscribe(callback: () => void): () => void {
  const handleStorage = () => {
    applyTheme();
    callback();
  };
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const handleMediaChange = () => {
    applyTheme();
    callback();
  };
  window.addEventListener('storage', handleStorage);
  mql.addEventListener('change', handleMediaChange);
  applyTheme();
  return () => {
    window.removeEventListener('storage', handleStorage);
    mql.removeEventListener('change', handleMediaChange);
  };
}

export function useTheme(): {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
} {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [theme, resolvedTheme] = snapshot.split(':') as [Theme, ResolvedTheme];

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme();
    // Notify subscribers in the same tab (native storage events only fire cross-tab)
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  }, []);

  return { theme, resolvedTheme, setTheme };
}
