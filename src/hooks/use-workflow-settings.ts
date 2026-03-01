'use client';

import { useCallback, useSyncExternalStore } from 'react';

export interface WorkflowSettings {
  maxRounds: number; // 1-5, default 3
  perspectiveCount: number; // 2-7, default 3
}

const STORAGE_KEY = 'lo-solver-workflow-settings';
const DEFAULT_SETTINGS: WorkflowSettings = { maxRounds: 3, perspectiveCount: 3 };

function getSnapshot(): WorkflowSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(stored) as Partial<WorkflowSettings>;
    return {
      maxRounds: typeof parsed.maxRounds === 'number' ? parsed.maxRounds : DEFAULT_SETTINGS.maxRounds,
      perspectiveCount:
        typeof parsed.perspectiveCount === 'number'
          ? parsed.perspectiveCount
          : DEFAULT_SETTINGS.perspectiveCount,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function getServerSnapshot(): WorkflowSettings {
  return DEFAULT_SETTINGS;
}

// Cache the snapshot reference so useSyncExternalStore sees stable values
let cachedSnapshot: WorkflowSettings = DEFAULT_SETTINGS;
let cachedRaw: string | null = null;

function getStableSnapshot(): WorkflowSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSnapshot = getSnapshot();
  }
  return cachedSnapshot;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export function useWorkflowSettings(): [
  WorkflowSettings,
  (settings: Partial<WorkflowSettings>) => void,
] {
  const settings = useSyncExternalStore(subscribe, getStableSnapshot, getServerSnapshot);

  const updateSettings = useCallback((partial: Partial<WorkflowSettings>) => {
    const current = getSnapshot();
    const merged = { ...current, ...partial };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    // Reset cache so next getStableSnapshot picks up the change
    cachedRaw = null;
    // Trigger re-render in this tab (storage event only fires cross-tab)
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  }, []);

  return [settings, updateSettings];
}
