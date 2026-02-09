'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type RunContextValue = {
  isRunning: boolean;
  setRunning: (running: boolean) => void;
  stopRun: () => void;
  registerStopHandler: (handler: () => void) => void;
};

const RunContext = createContext<RunContextValue>({
  isRunning: false,
  setRunning: () => {},
  stopRun: () => {},
  registerStopHandler: () => {},
});

export function RunContextProvider({ children }: { children: ReactNode }) {
  const [isRunning, setIsRunning] = useState(false);
  const [stopHandler, setStopHandler] = useState<(() => void) | null>(null);

  const setRunning = useCallback((running: boolean) => {
    setIsRunning(running);
  }, []);

  const registerStopHandler = useCallback((handler: () => void) => {
    setStopHandler(() => handler);
  }, []);

  const stopRun = useCallback(() => {
    stopHandler?.();
    setIsRunning(false);
  }, [stopHandler]);

  return (
    <RunContext.Provider value={{ isRunning, setRunning, stopRun, registerStopHandler }}>
      {children}
    </RunContext.Provider>
  );
}

export function useRunContext() {
  return useContext(RunContext);
}
