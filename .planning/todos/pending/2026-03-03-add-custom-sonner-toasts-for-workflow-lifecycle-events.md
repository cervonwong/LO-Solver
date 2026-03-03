---
created: 2026-03-03T11:51:48.133Z
title: Add custom Sonner toasts for workflow lifecycle events
area: ui
files:
  - src/app/page.tsx
  - src/components/
---

## Problem

The app currently has no user-facing toast notifications for key workflow lifecycle events. Users get no feedback outside the main UI when:
- A solve workflow starts
- Results are ready / workflow completes
- The workflow is aborted
- Accumulated API costs cross notable thresholds during a run

This is especially useful when the user scrolls away from the progress area or has the tab partially in view — toasts provide non-intrusive, dismissible confirmations.

## Solution

- Install `sonner` (or use shadcn `sonner` component via `npx shadcn@latest add sonner`)
- Add `<Toaster />` to the root layout
- Emit toasts at key points:
  - **Solve started**: when the workflow begins execution
  - **Results ready**: when the workflow completes successfully
  - **Aborted**: when the user aborts the workflow
  - **Cost warning**: when cumulative cost since workflow start crosses configurable thresholds (e.g. $0.10, $0.25, $0.50)
- Style toasts to match the app's dark theme and design system (see DESIGN.md)
