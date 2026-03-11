---
created: 2026-03-11T14:03:37.418Z
title: Add custom port parameter to npm run dev
area: tooling
files:
  - package.json
---

## Problem

The `npm run dev` command starts Next.js on port 3000 and Mastra dev server on port 4111 with no way to override these ports. When those ports are already in use, the dev server fails to start. Need a way to pass custom ports as parameters.

## Solution

Add support for a PORT or similar environment variable / CLI parameter to `npm run dev` (and possibly `dev:next` / `dev:mastra`) scripts so ports can be customized at startup, e.g. `PORT=3001 npm run dev`.
