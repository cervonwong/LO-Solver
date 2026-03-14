---
created: 2026-03-14T03:47:50.138Z
title: Add parallelisation of Claude Code agent instances
area: general
files: []
---

## Problem

Currently only one hypothesizer agent runs at a time when using Claude Code as a provider. This is a bottleneck — agents should be able to run in parallel where the workflow allows it, similar to how OpenRouter-based agents can run concurrently.

## Solution

Investigate how Claude Code agent instances are spawned and whether they can be parallelised. May require changes to the workflow orchestration or the Claude Code provider to support concurrent agent execution.
