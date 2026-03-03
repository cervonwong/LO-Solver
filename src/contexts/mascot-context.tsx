'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export type MascotState = 'idle' | 'ready' | 'solving' | 'solved' | 'error' | 'aborted';

interface MascotContextValue {
  mascotState: MascotState;
  setMascotState: (state: MascotState) => void;
}

const MascotContext = createContext<MascotContextValue | null>(null);

export function MascotProvider({ children }: { children: ReactNode }) {
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  return (
    <MascotContext.Provider value={{ mascotState, setMascotState }}>
      {children}
    </MascotContext.Provider>
  );
}

export function useMascotState() {
  const ctx = useContext(MascotContext);
  if (!ctx) throw new Error('useMascotState must be used within MascotProvider');
  return ctx;
}
