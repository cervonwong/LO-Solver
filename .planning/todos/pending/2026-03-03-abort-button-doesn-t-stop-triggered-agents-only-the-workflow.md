---
created: 2026-03-03T01:25:13.880Z
title: Abort button doesn't stop triggered agents, only the workflow
area: general
files: []
---

## Problem

The abort button in the UI stops the workflow execution but does not cancel the agents that were already triggered by the workflow. These agents continue running (and consuming API credits) even after the user has aborted. This means the abort is only partial — the orchestration stops but the underlying LLM calls keep going.

This affects all workflow steps that spawn agent calls (extract, hypothesize, verify/improve loop, answer). When a user aborts mid-execution, any in-flight `Agent.generate()` calls via `generateWithRetry` will continue until they complete or time out (up to 10 minutes per the retry wrapper).

## Solution

1. Research Mastra documentation for agent abort/cancellation APIs — check if `Agent.generate()` supports `AbortSignal` or similar cancellation mechanism
2. Investigate whether the workflow's `AbortController` signal can be propagated down to individual agent calls
3. May require architecture change to how agents are invoked in workflow steps (e.g., passing abort signals through `generateWithRetry`, or using a shared `AbortController` in RequestContext)
4. Consider whether Mastra's workflow system provides built-in cancellation propagation to child agent calls
