'use client';

import { useCallback, useSyncExternalStore } from 'react';

type ModelMode = 'testing' | 'production';

const STORAGE_KEY = 'lo-solver-model-mode';
const DEFAULT_MODE: ModelMode = 'testing';

function getSnapshot(): ModelMode {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'production' ? 'production' : 'testing';
}

function getServerSnapshot(): ModelMode {
  return DEFAULT_MODE;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export function useModelMode(): [ModelMode, (mode: ModelMode) => void] {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setMode = useCallback((newMode: ModelMode) => {
    localStorage.setItem(STORAGE_KEY, newMode);
    // Trigger re-render in this tab (storage event only fires cross-tab)
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  }, []);

  return [mode, setMode];
}
