'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface WorkflowControlContextValue {
  isRunning: boolean;
  hasStarted: boolean;
  isAborting: boolean;
  stop: () => void;
  handleReset: () => void;
  requiresKeyEntry: boolean;
  openKeyDialog: () => void;
}

interface RegisterCallbacks {
  setIsRunning: (value: boolean) => void;
  setHasStarted: (value: boolean) => void;
  setIsAborting: (value: boolean) => void;
  setRequiresKeyEntry: (value: boolean) => void;
  stopRef: React.MutableRefObject<() => void>;
  handleResetRef: React.MutableRefObject<() => void>;
  openKeyDialogRef: React.MutableRefObject<() => void>;
}

const WorkflowControlContext = createContext<WorkflowControlContextValue | null>(null);
const RegisterContext = createContext<RegisterCallbacks | null>(null);

const noop = () => {};

export function WorkflowControlProvider({ children }: { children: ReactNode }) {
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isAborting, setIsAborting] = useState(false);
  const [requiresKeyEntry, setRequiresKeyEntry] = useState(false);
  const stopRef = useRef<() => void>(noop);
  const handleResetRef = useRef<() => void>(noop);
  const openKeyDialogRef = useRef<() => void>(noop);

  const stop = useCallback(() => {
    stopRef.current();
  }, []);

  const handleReset = useCallback(() => {
    handleResetRef.current();
  }, []);

  const openKeyDialog = useCallback(() => {
    openKeyDialogRef.current();
  }, []);

  const controlValue: WorkflowControlContextValue = {
    isRunning,
    hasStarted,
    isAborting,
    stop,
    handleReset,
    requiresKeyEntry,
    openKeyDialog,
  };

  const registerValue: RegisterCallbacks = {
    setIsRunning,
    setHasStarted,
    setIsAborting,
    setRequiresKeyEntry,
    stopRef,
    handleResetRef,
    openKeyDialogRef,
  };

  return (
    <RegisterContext.Provider value={registerValue}>
      <WorkflowControlContext.Provider value={controlValue}>
        {children}
      </WorkflowControlContext.Provider>
    </RegisterContext.Provider>
  );
}

export function useWorkflowControl() {
  const ctx = useContext(WorkflowControlContext);
  if (!ctx) throw new Error('useWorkflowControl must be used within WorkflowControlProvider');
  return ctx;
}

export function useRegisterWorkflowControl(opts: {
  isRunning: boolean;
  hasStarted: boolean;
  isAborting: boolean;
  stop: () => void;
  handleReset: () => void;
}) {
  const register = useContext(RegisterContext);
  if (!register)
    throw new Error('useRegisterWorkflowControl must be used within WorkflowControlProvider');

  const { setIsRunning, setHasStarted, setIsAborting, stopRef, handleResetRef } = register;

  useEffect(() => {
    setIsRunning(opts.isRunning);
  }, [opts.isRunning, setIsRunning]);

  useEffect(() => {
    setHasStarted(opts.hasStarted);
  }, [opts.hasStarted, setHasStarted]);

  useEffect(() => {
    setIsAborting(opts.isAborting);
  }, [opts.isAborting, setIsAborting]);

  useEffect(() => {
    stopRef.current = opts.stop;
  }, [opts.stop, stopRef]);

  useEffect(() => {
    handleResetRef.current = opts.handleReset;
  }, [opts.handleReset, handleResetRef]);
}

export function useRegisterKeyControl(opts: {
  requiresKeyEntry: boolean;
  openKeyDialog: () => void;
}) {
  const register = useContext(RegisterContext);
  if (!register)
    throw new Error('useRegisterKeyControl must be used within WorkflowControlProvider');

  const { setRequiresKeyEntry, openKeyDialogRef } = register;

  useEffect(() => {
    setRequiresKeyEntry(opts.requiresKeyEntry);
  }, [opts.requiresKeyEntry, setRequiresKeyEntry]);

  useEffect(() => {
    openKeyDialogRef.current = opts.openKeyDialog;
  }, [opts.openKeyDialog, openKeyDialogRef]);
}
