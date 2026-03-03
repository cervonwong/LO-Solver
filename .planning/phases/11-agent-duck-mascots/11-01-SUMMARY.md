---
phase: 11-agent-duck-mascots
plan: 01
status: complete
started: 2026-03-03
completed: 2026-03-03
---

## Summary

Added oversized, color-tinted duck mascot icons to agent cards in the trace panel. Each duck uses `lex-thinking.png` while the agent is active and swaps to `lex-happy.png` on completion, with a per-role color tint and animated entrance/active/completion states.

## Key Files

### Created
- `src/lib/agent-roles.ts` — `getAgentRole()` function mapping agent names to 5 role groups (extractor, hypothesizer, tester, improver, answerer) with associated colors and border classes

### Modified
- `src/app/globals.css` — Added `--role-improver` CSS variable, duck animation keyframes (`duck-pop-in`, `duck-bob`, `duck-complete-pop`), utility classes, and `.duck-tint` overlay class with `mask-image` support for transparency preservation
- `src/components/trace-event-card.tsx` — AgentCard now displays a 44px duck mascot overflowing top-left when expanded (20px when collapsed), with role-colored tint overlay via `mix-blend-mode: color` masked to duck silhouette, role-colored left border, blinking cyan dot activity indicator, and smooth size/position transitions on collapse/expand

## Decisions

- Used `mask-image` on the tint overlay div (matching the duck PNG) so color tint only applies to opaque pixels, preserving transparent background
- Moved bob/pop animations to a parent wrapper div containing both the Image and tint overlay, ensuring they animate in sync
- Collapsed duck tucks into the card boundary (`top: 4px, left: 8px`) while expanded duck overflows (`top: -10px, left: -12px`)
- Reduced expanded duck from planned 56px to 44px and collapsed from 24px to 20px for better visual proportions
- Replaced spinning mini-duck active indicator with a blinking cyan dot

## Deviations

- Duck sizes adjusted from plan (56px/24px → 44px/20px) based on visual verification feedback
- Duck positioning tuned iteratively during visual verification checkpoint

## Self-Check: PASSED
