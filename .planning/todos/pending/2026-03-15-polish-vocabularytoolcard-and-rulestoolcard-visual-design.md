---
created: 2026-03-15T02:28:20.245Z
title: Polish VocabularyToolCard and RulesToolCard visual design
area: ui
files:
  - src/components/trace/specialized-tools.tsx:27-199
  - src/components/trace/shared.tsx
  - src/components/trace/trace-utils.tsx
---

## Problem

The VocabularyToolCard and RulesToolCard components (added in quick task 10) display the correct data but the visual presentation needs polish. Issues include:
- Badge + entry layout is dense and hard to scan at a glance
- Text truncation on rule descriptions may clip important context
- No visual grouping when multiple entries are shown (entries run together)
- Color-coded badges (ADD/UPDATE/REMOVE) could use better contrast or styling to match the blueprint design system
- The >5 entry fallback ("N entries") loses all detail — could show a collapsed preview instead

Both cards follow the same structure so improvements should be applied consistently.

## Solution

Review both card components against DESIGN.md conventions and improve:
1. Add subtle separators or spacing between entries
2. Consider a compact table or grid layout instead of inline flex rows
3. Improve badge contrast and sizing for the blueprint/cyanotype theme
4. Replace the >5 entry hard cutoff with a "show first 5 + N more" collapsible pattern
5. Ensure consistency with existing SentenceTestToolCard and RuleTestCard visual style
