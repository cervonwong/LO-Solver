'use client';

import { useCallback, useSyncExternalStore } from 'react';

type ProviderMode =
  | 'openrouter-testing'
  | 'openrouter-production'
  | 'claude-code-testing'
  | 'claude-code-production';

const STORAGE_KEY = 'lo-solver-provider-mode';
const OLD_STORAGE_KEY = 'lo-solver-model-mode';
const DEFAULT_MODE: ProviderMode = 'openrouter-testing';
const VALID_MODES: readonly ProviderMode[] = [
  'openrouter-testing',
  'openrouter-production',
  'claude-code-testing',
  'claude-code-production',
];

export function isClaudeCodeMode(mode: ProviderMode): boolean {
  return mode === 'claude-code-testing' || mode === 'claude-code-production';
}

export function isOpenRouterMode(mode: ProviderMode): boolean {
  return mode === 'openrouter-testing' || mode === 'openrouter-production';
}

function getSnapshot(): ProviderMode {
  if (typeof window === 'undefined') return DEFAULT_MODE;

  // Migrate from old key if new key doesn't exist yet
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing === null) {
    const oldValue = localStorage.getItem(OLD_STORAGE_KEY);
    if (oldValue !== null) {
      const migrated: ProviderMode =
        oldValue === 'production' ? 'openrouter-production' : 'openrouter-testing';
      localStorage.setItem(STORAGE_KEY, migrated);
      localStorage.removeItem(OLD_STORAGE_KEY);
      return migrated;
    }
  }

  const stored = localStorage.getItem(STORAGE_KEY);

  // Migrate from old 'claude-code' value to 'claude-code-testing'
  if (stored === 'claude-code') {
    localStorage.setItem(STORAGE_KEY, 'claude-code-testing');
    return 'claude-code-testing';
  }

  if (stored && VALID_MODES.includes(stored as ProviderMode)) {
    return stored as ProviderMode;
  }
  return DEFAULT_MODE;
}

function getServerSnapshot(): ProviderMode {
  return DEFAULT_MODE;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export function useProviderMode(): [ProviderMode, (mode: ProviderMode) => void] {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setMode = useCallback((newMode: ProviderMode) => {
    localStorage.setItem(STORAGE_KEY, newMode);
    // Trigger re-render in this tab (storage event only fires cross-tab)
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  }, []);

  return [mode, setMode];
}
