---
created: 2026-03-13T03:35:00.000Z
title: Explore solving LO problems as code using sandboxes
area: general
files: []
---

## Problem

Currently the solver workflow uses LLM agents to reason about linguistic rules and apply them textually. An alternative approach would be to have agents write executable code (e.g., Python/JS) that encodes the linguistic rules as functions, then run that code in a sandbox to produce translations. This could improve accuracy — code execution is deterministic and testable, unlike text-based rule application which is prone to LLM hallucination.

Mastra now supports multiple sandbox providers that could enable this: E2B, and potentially other newly supported sandbox integrations. Need to evaluate which sandbox options are available in the current Mastra version and which best fits this use case.

## Solution

1. Research Mastra's sandbox/code execution capabilities — check docs for E2B integration and any other supported sandbox providers (Mastra recently added support for new sandbox types)
2. Design a "code-as-rules" approach: agents generate Python/JS code that implements linguistic rules, sandbox executes it against test data
3. Compare trade-offs: code sandbox approach vs current text-based approach (latency, cost, accuracy, complexity)
4. Prototype with a simple problem to validate feasibility
5. Consider hybrid: use code for rule verification/testing, keep LLM reasoning for rule discovery
