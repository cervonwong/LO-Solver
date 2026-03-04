---
created: 2026-03-02T15:35:04.898Z
title: Audit large files for refactor opportunities
area: general
files: []
---

## Problem

Some source files may have grown too large over time and could benefit from being split into smaller, focused modules. No systematic audit has been done to identify which files exceed a reasonable size threshold (~300 lines) and whether their contents warrant splitting.

Key concerns:
- Files with multiple unrelated responsibilities should be decomposed
- Long files are harder to navigate, review, and maintain
- Especially check `src/mastra/workflow/`, `src/components/`, `src/lib/`, and agent files

## Solution

1. Run `wc -l` across `src/**/*.ts` and `src/**/*.tsx` to identify files over ~300 lines
2. For each large file, assess whether it contains multiple logical concerns that could be separated
3. Prioritize splits that improve maintainability without changing behavior
4. No refactor skill is available — use manual audit with `superpowers:brainstorming` if needed for design decisions
