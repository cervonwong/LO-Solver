---
created: 2026-03-14T03:47:50.138Z
title: Fix tool rendering for testSentence and testRule in UI
area: ui
files:
  - src/components/TraceEventCard.tsx
  - src/lib/trace-utils.ts
---

## Problem

The UI display of `testSentence` and `testRule` tool calls always shows FAIL even when some actually PASSED. The issue is in the parsing logic — the Zod schema parameters aren't being correctly parsed to find the right parameter that indicates pass/fail status. This gives a misleading impression that all tests are failing.

## Solution

Fix the tool result parsing in the trace UI to correctly extract the pass/fail status from the Zod-validated response. Improve the rendering to accurately distinguish between passed and failed test results.
