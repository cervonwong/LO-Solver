'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'lo-solver-api-key';

function getSnapshot(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot(): string | null {
  return null;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export function useApiKey(): [string | null, (key: string | null) => void] {
  const apiKey = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setApiKey = useCallback((key: string | null) => {
    if (!key || key === '') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, key);
    }
    // Trigger re-render in this tab (storage event only fires cross-tab)
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  }, []);

  return [apiKey, setApiKey];
}
