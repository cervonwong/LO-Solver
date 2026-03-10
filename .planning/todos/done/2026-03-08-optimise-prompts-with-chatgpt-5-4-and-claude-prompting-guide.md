---
created: 2026-03-08T02:23:54.862Z
title: Optimise prompts with ChatGPT 5.4 and Claude prompting guide
area: general
files: []
---

## Problem

The solver workflow agent prompts (system instructions in `*-instructions.ts` files) have not been systematically optimised using the latest prompting best practices. ChatGPT 5.4 and the Claude prompting guide offer techniques (structured reasoning cues, prompt engineering patterns, model-specific tips) that could improve extraction accuracy, hypothesis quality, and verification thoroughness.

## Solution

- Review the ChatGPT 5.4 prompting guide and Claude prompting guide for applicable techniques
- Audit each agent's system prompt (`src/mastra/workflow/*-instructions.ts`) against best practices
- Apply relevant improvements: clearer role definitions, chain-of-thought cues, output format constraints, example-driven instructions
- Re-run evals to measure impact of prompt changes
