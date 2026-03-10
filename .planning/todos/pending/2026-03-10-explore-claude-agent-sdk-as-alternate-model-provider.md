---
created: 2026-03-10T10:07:57.652Z
title: Explore Claude Agent SDK as alternate model provider
area: general
files:
  - src/mastra/openrouter.ts
  - src/mastra/index.ts
---

## Problem

Currently all LLM access goes through OpenRouter (`src/mastra/openrouter.ts`), which requires API credits. Claude models are available via subscription through the Claude Agent SDK, which could provide an alternative model provider path — potentially reducing costs or enabling usage through an existing Claude subscription instead of paying per-token through OpenRouter.

Reference implementation / integration example: https://github.com/t3ta/claude-code-mastra

## Solution

- Investigate the Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) as a Mastra model provider
- Evaluate the `claude-code-mastra` repo for patterns on integrating Claude Agent SDK with Mastra
- Determine if Claude subscription usage can be leveraged for solver workflow LLM calls
- Prototype a provider alongside the existing OpenRouter setup so both can coexist
