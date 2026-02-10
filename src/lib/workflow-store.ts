import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import type { WorkflowEvent } from './workflow-events';

// --- Domain types ---

export interface VocabularyEntry {
  foreignForm: string;
  meaning: string;
  type: string;
}

export interface StructuredProblem {
  context: string;
  dataset: Array<{ source: string; target: string }>;
  questions: Array<{ id: string; text: string }>;
}

export interface Answer {
  questionId: string;
  questionText: string;
  answer: string;
}

export interface Rule {
  id: string;
  description: string;
  status: 'passing' | 'failing' | 'untested';
}

export interface Results {
  answers: Answer[];
  rules: Rule[];
}

// --- Store types ---

export interface WorkflowStore {
  // State
  events: WorkflowEvent[];
  nodes: Node[];
  edges: Edge[];
  selectedAgentId: string | null;
  vocabulary: Map<string, VocabularyEntry>;
  structuredProblem: StructuredProblem | null;
  results: Results | null;
  runStatus: 'idle' | 'running' | 'complete' | 'error';
  currentIteration: number;
  problemText: string;
  openPane: 'problem' | 'vocabulary' | 'results' | null;

  // Actions
  addEvent: (event: WorkflowEvent) => void;
  setSelectedAgent: (agentId: string | null) => void;
  setOpenPane: (pane: 'problem' | 'vocabulary' | 'results' | null) => void;
  startRun: (problemText: string) => void;
  completeRun: () => void;
  errorRun: () => void;
  stopRun: () => void;
  reset: () => void;
}

const initialState = {
  events: [] as WorkflowEvent[],
  nodes: [] as Node[],
  edges: [] as Edge[],
  selectedAgentId: null as string | null,
  vocabulary: new Map<string, VocabularyEntry>(),
  structuredProblem: null as StructuredProblem | null,
  results: null as Results | null,
  runStatus: 'idle' as const,
  currentIteration: 0,
  problemText: '',
  openPane: null as 'problem' | 'vocabulary' | 'results' | null,
};

export const useWorkflowStore = create<WorkflowStore>()((set) => ({
  ...initialState,

  addEvent: (event) =>
    set((state) => {
      const events = [...state.events, event];

      switch (event.type) {
        case 'data-vocabulary-update': {
          const vocabulary = new Map(state.vocabulary);
          const { action, entries } = event.data;

          if (action === 'clear') {
            vocabulary.clear();
          } else if (action === 'remove') {
            for (const entry of entries) {
              vocabulary.delete(entry.foreignForm);
            }
          } else {
            // 'add' or 'update'
            for (const entry of entries) {
              vocabulary.set(entry.foreignForm, {
                foreignForm: entry.foreignForm,
                meaning: entry.meaning,
                type: entry.type,
              });
            }
          }

          return { events, vocabulary };
        }

        case 'data-iteration-update': {
          return { events, currentIteration: event.data.iteration };
        }

        case 'data-step-start':
        case 'data-step-complete':
        case 'data-agent-start':
        case 'data-agent-complete':
        case 'data-agent-reasoning':
        case 'data-tool-call': {
          return { events };
        }

        default: {
          return { events };
        }
      }
    }),

  setSelectedAgent: (agentId) => set({ selectedAgentId: agentId }),

  setOpenPane: (pane) => set({ openPane: pane }),

  startRun: (problemText) =>
    set({
      ...initialState,
      problemText,
      runStatus: 'running',
      vocabulary: new Map(),
    }),

  completeRun: () => set({ runStatus: 'complete' }),

  errorRun: () => set({ runStatus: 'error' }),

  stopRun: () =>
    set({
      runStatus: 'idle',
      events: [],
      nodes: [],
      edges: [],
      selectedAgentId: null,
      vocabulary: new Map(),
      structuredProblem: null,
      results: null,
      currentIteration: 0,
      openPane: null,
    }),

  reset: () =>
    set({
      ...initialState,
      vocabulary: new Map(),
      openPane: null,
    }),
}));
