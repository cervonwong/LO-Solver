---
created: 2026-03-14T03:47:50.138Z
title: Investigate cost estimation for Claude via tokens
area: general
files: []
---

## Problem

There is no cost tracking or estimation when using Claude as a model provider. It's unclear whether the API returns token usage or cost information that could be surfaced to the user.

## Solution

Investigate whether Claude API responses include token counts or cost parameters. If available, build a cost estimation/tracking feature. Check both the direct API response and any Mastra abstractions that may expose this data.
