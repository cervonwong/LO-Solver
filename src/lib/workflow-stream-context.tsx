'use client';

import { createContext, useContext } from 'react';
import { useWorkflowStream } from './use-workflow-stream';

type WorkflowStreamContextType = ReturnType<typeof useWorkflowStream>;

const WorkflowStreamContext = createContext<WorkflowStreamContextType | null>(null);

export function WorkflowStreamProvider({ children }: { children: React.ReactNode }) {
  const stream = useWorkflowStream();
  return (
    <WorkflowStreamContext.Provider value={stream}>{children}</WorkflowStreamContext.Provider>
  );
}

export function useWorkflowStreamContext() {
  const ctx = useContext(WorkflowStreamContext);
  if (!ctx) throw new Error('useWorkflowStreamContext must be used within WorkflowStreamProvider');
  return ctx;
}
