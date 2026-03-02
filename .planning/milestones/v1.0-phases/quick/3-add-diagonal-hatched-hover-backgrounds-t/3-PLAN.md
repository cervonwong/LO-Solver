---
phase: quick
plan: 3
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/globals.css
autonomous: true
requirements: []

must_haves:
  truths:
    - "Hovering a stamp-btn shows diagonal hatching in red"
    - "Hovering a stamp-btn-accent shows diagonal hatching in cyan"
    - "Hovering a stamp-btn-secondary shows diagonal hatching in white"
    - "Disabled buttons show no hatching on hover"
  artifacts:
    - path: "src/app/globals.css"
      provides: "Updated hover rules for all three stamp button variants"
      contains: "repeating-linear-gradient"
  key_links:
    - from: "src/app/globals.css"
      to: "stamp button hover states"
      via: "CSS selector .stamp-btn:hover:not(:disabled)"
      pattern: "stamp-btn.*hover.*not.*disabled"
---

<objective>
Add diagonal hatched backgrounds to stamp button hover states using CSS repeating-linear-gradient.

Purpose: Visual polish — hovering stamp buttons reveals a diagonal hatching pattern in each variant's accent color, replacing the current flat semi-transparent fills.
Output: Updated hover rules in globals.css for .stamp-btn, .stamp-btn-accent, and .stamp-btn-secondary.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Design doc: docs/plans/2026-03-02-hatched-button-hover-design.md

Existing hover rules (lines 251-253, 287-290, 321-323 of src/app/globals.css):

```css
/* Current — to be replaced */
.stamp-btn:hover {
  background: rgba(224, 74, 74, 0.1);
}

.stamp-btn-accent:hover {
  background: rgba(0, 255, 255, 0.08);
  box-shadow: 0 0 16px rgba(0, 255, 255, 0.4);
}

.stamp-btn-secondary:hover {
  background: var(--muted);
}
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace hover backgrounds with diagonal hatching</name>
  <files>src/app/globals.css</files>
  <action>
    In src/app/globals.css, make three targeted changes to the existing hover rules:

    1. Replace `.stamp-btn:hover` block (currently lines ~251-253):
    ```css
    .stamp-btn:hover:not(:disabled) {
      background: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 7px,
        currentColor 7px,
        currentColor 8px
      );
    }
    ```
    Note: rename selector from `.stamp-btn:hover` to `.stamp-btn:hover:not(:disabled)`.

    2. Replace `.stamp-btn-accent:hover` block (currently lines ~287-290) — keep box-shadow, replace background:
    ```css
    .stamp-btn-accent:hover:not(:disabled) {
      background: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 7px,
        currentColor 7px,
        currentColor 8px
      );
      box-shadow: 0 0 16px rgba(0, 255, 255, 0.4);
    }
    ```
    Note: rename selector and replace background only; preserve box-shadow.

    3. Replace `.stamp-btn-secondary:hover` block (currently lines ~321-323):
    ```css
    .stamp-btn-secondary:hover:not(:disabled) {
      background: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 7px,
        currentColor 7px,
        currentColor 8px
      );
    }
    ```
    Note: rename selector and replace background.

    The `:not(:disabled)` guard on each selector is the key change — disabled buttons already have their own rules with `opacity: 0.4` and no background change, and the guard prevents hatching from leaking through on disabled hover.

    Do not change any other rules (active, disabled, base styles).
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -v "globals.css\|Cannot find module './globals.css'" | head -20</automated>
  </verify>
  <done>
    All three hover selectors use repeating-linear-gradient with 45deg / 1px lines / 8px spacing / currentColor. Disabled buttons are excluded via :not(:disabled). No other rules changed.
  </done>
</task>

</tasks>

<verification>
Visual check: open the app and hover each stamp button variant. Each should show diagonal lines in its respective accent color. Disabled buttons should show no hatching.
</verification>

<success_criteria>
- .stamp-btn:hover:not(:disabled) shows red diagonal hatching (#e04a4a via currentColor)
- .stamp-btn-accent:hover:not(:disabled) shows cyan diagonal hatching (var(--accent) via currentColor)
- .stamp-btn-secondary:hover:not(:disabled) shows white/foreground diagonal hatching
- Disabled buttons: no hatching visible on hover
- TypeScript check passes with no new errors
</success_criteria>

<output>
After completion, create `.planning/quick/3-add-diagonal-hatched-hover-backgrounds-t/3-SUMMARY.md`
</output>
