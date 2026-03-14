---
created: 2026-03-14T03:47:50.138Z
title: Make vocab and rules table horizontally scrollable
area: ui
files:
  - src/components/TraceEventCard.tsx
---

## Problem

The vocabulary and rules tables in the UI overflow their container on narrow viewports or when entries have long content. They need horizontal scrolling to remain usable.

## Solution

Add `overflow-x-auto` wrapper or similar horizontal scroll container around the vocab and rules tables so they scroll horizontally instead of breaking the layout.
