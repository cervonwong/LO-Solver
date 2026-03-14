---
created: 2026-03-09T03:54:33.803Z
title: Investigate production model failures and improve prompts
area: general
files:
  - src/mastra/workflow/logging-utils.ts
  - src/mastra/workflow/
  - src/evals/problems.ts
---

## Problem

Production models (weaker/cheaper LLMs) fail on problems but we lack visibility into why. The trace/logging feature needs to be verified as working reliably so we can inspect step-by-step reasoning. Beyond that, we need a deeper understanding of what linguistic knowledge and thinking patterns are required to solve Linguistics Olympiad problems, which would inform better agent prompts.

## Solution

Multi-part approach:

1. **Verify trace file writing** — Ensure `logging-utils.ts` reliably writes complete traces to disk so we can inspect production model failures step by step.

2. **Build annotated problem corpus** — Extract more sample questions from APLO, IOL, and OLing competitions with full solutions (not just answers). Add these to the evaluation set.

3. **Analyse required thinking patterns** — Use an Opus-level subagent to: attempt each problem independently, then compare against the ground-truth solution, and document what thinking patterns and linguistics knowledge were needed to solve it (e.g., agglutination, tone systems, numeral bases, kinship systems).

4. **Improve workflow prompts** — Use the analysis from step 3 to refine the system prompts across the workflow steps, teaching the agents the specific reasoning strategies that successful solutions require.
