'use client';

import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { TopBar } from '@/components/top-bar/top-bar';
import { WorkflowCanvas } from '@/components/flow/workflow-canvas';

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
          <div className="flex h-full items-center justify-center bg-muted/10 text-muted-foreground">
            Detail Panel (Sprint 4)
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
