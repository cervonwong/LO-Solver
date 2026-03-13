---
created: 2026-03-13T03:34:52.450Z
title: Explore Mastra programmatic tool calling to improve results
area: general
files: []
---

## Problem

The current workflow relies on agents making autonomous tool calls during generation. Mastra supports programmatic tool calling where the application code can invoke tools directly and feed results back into the agent context. This could give more control over the verification loop — for example, calling tester tools programmatically rather than relying on the orchestrator agent to decide which tools to call and in what order. This may improve reliability and consistency of results, especially in the verify-improve cycle.

## Solution

1. Research Mastra's programmatic tool calling API (`agent.generate()` with tool results, `Tool.execute()` direct invocation, etc.)
2. Identify workflow steps where programmatic tool calling could replace or supplement agent-driven tool use (likely the verify step orchestrator)
3. Prototype a hybrid approach — keep agent reasoning but programmatically dispatch tool calls for deterministic patterns (e.g., "test all rules" → call rule tester for each rule)
4. Compare results quality and reliability vs current approach
