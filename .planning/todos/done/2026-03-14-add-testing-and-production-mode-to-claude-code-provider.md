---
created: 2026-03-14T03:47:50.138Z
title: Add testing and production mode to Claude Code provider
area: general
files:
  - src/mastra/workflow/agent-factory.ts
---

## Problem

The Claude Code provider option doesn't support the existing testing/production mode distinction that OpenRouter models have. There's no way to switch between cheaper models (for development/testing) and more expensive models (for production quality) when using Claude Code as the provider.

## Solution

Extend the Claude Code provider configuration to support testing and production mode, mapping to different Claude models (e.g., Haiku for testing, Sonnet/Opus for production). Align with the existing mode toggle in the UI.
