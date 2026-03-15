---
phase: quick-12
plan: 1
subsystem: frontend
tags: [ui, trace, rules, badge]
key-files:
  modified: [src/components/trace/specialized-tools.tsx]
decisions: []
metrics:
  duration: 60s
  completed: "2026-03-15T09:18:42Z"
---

# Quick Task 12: Add Confidence Badge to RulesToolCard Entries

Right-aligned confidence badge on each RulesEntryRow using outline variant with color-coded borders (HIGH=success, MEDIUM=warning, LOW=error).

## Changes

### Task 1: Add confidence badge to RulesEntryRow
**Commit:** d0544e4

Updated `RulesEntryRow` in `src/components/trace/specialized-tools.tsx`:

- Added `confidenceBadgeClass` lookup map for HIGH/MEDIUM/LOW color mappings
- Extracted `confidence` field from entry objects (skipped for string entries)
- Changed row layout to `flex items-start justify-between gap-2` so badge flushes right
- Wrapped title + description in `min-w-0 flex-1` container for proper truncation
- Badge renders conditionally only when confidence field exists and maps to a known level
- Badge uses `variant="outline"` with `bg-transparent text-[10px] flex-shrink-0` matching existing badge sizing

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- `npx tsc --noEmit` passes (only pre-existing CSS module and skeleton.tsx errors remain)
- No new type errors introduced
- Badge only renders when confidence field is present on entry object
- Color mapping: HIGH -> border-status-success/text-status-success, MEDIUM -> border-status-warning/text-status-warning, LOW -> border-status-error/text-status-error
