'use client';

import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { TopBar } from '@/components/top-bar/top-bar';
import { WorkflowCanvas } from '@/components/flow/workflow-canvas';
import { DetailPanel } from '@/components/detail/detail-panel';
import { StructuredProblemPane } from '@/components/panes/structured-problem-pane';
import { VocabularyPane } from '@/components/panes/vocabulary-pane';
import { ResultsPane } from '@/components/panes/results-pane';

export default function Home() {
  return (
    <div className="flex h-screen flex-col">
      {/* Top Bar */}
      <TopBar />

      {/* Main content area */}
      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        {/* Flow Canvas */}
        <ResizablePanel defaultSize={60} minSize={30}>
          <WorkflowCanvas />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Detail Panel */}
        <ResizablePanel defaultSize={40} minSize={20}>
          <DetailPanel />
        </ResizablePanel>
      </ResizablePanelGroup>

      <StructuredProblemPane />
      <VocabularyPane />
      <ResultsPane />
    </div>
  );
}
