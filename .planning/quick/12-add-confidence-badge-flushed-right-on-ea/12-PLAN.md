---
phase: quick-12
plan: 1
type: execute
wave: 1
depends_on: []
files_modified: [src/components/trace/specialized-tools.tsx]
autonomous: true
requirements: []
---

<objective>
Add confidence badge to RulesEntryRow, flushed right on each rule entry row in the expanded collapsible.

Purpose: Visibility of rule confidence levels (HIGH, MEDIUM, LOW) during verification/iteration.
Output: Updated RulesEntryRow with right-aligned confidence badge.
</objective>

<context>
@src/components/trace/specialized-tools.tsx — Current RulesEntryRow and RulesToolCard implementation.

# Design System
- Badges always use `variant="outline"` with transparent bg and colored border (DESIGN.md § Badges)
- HIGH = green/success, MEDIUM = yellow/warning, LOW = error/red (status color mapping)
- Size should match existing badge sizing (text-[10px])
</context>

<tasks>

<task type="auto">
  <name>Add confidence badge to RulesEntryRow</name>
  <files>src/components/trace/specialized-tools.tsx</files>
  <action>
Update the RulesEntryRow component (currently lines 169-190) to:

1. Extract the `confidence` field from entry (only if entry is an object, not a string)
2. Replace the current single-row layout with a flex container that uses `justify-between`:
   - Left side: title and description (flex-1)
   - Right side: confidence badge (flex-shrink-0)
3. Add the confidence badge only if confidence field exists
4. Use colored borders based on confidence level:
   - HIGH: border-status-success, text-status-success
   - MEDIUM: border-status-warning, text-status-warning
   - LOW: border-status-error, text-status-error
5. Badge should use text-[10px] to match existing badges in the file

Example confidence extraction:
```typescript
const confidence = typeof entry === 'string' ? undefined : (entry.confidence as string | undefined);
```

The row structure should allow title/description to truncate if needed, while the badge always stays visible on the right.
  </action>
  <verify>
npm run build -- --no-optimization passes without errors
  </verify>
  <done>
RulesEntryRow renders confidence badge on right side of each rule entry. Badge displays with appropriate color based on HIGH/MEDIUM/LOW value. Title and description layout unchanged (left-aligned, can truncate). Badge always visible, never wraps or hides.
  </done>
</task>

</tasks>

<verification>
After implementation:
1. Type check passes: `npx tsc --noEmit` (ignore pre-existing globals.css error)
2. UI renders: confidence badge appears right-aligned on all rule entries with confidence field
3. Color coding correct: HIGH/MEDIUM/LOW map to status-success/status-warning/status-error
4. Layout stable: adding badge doesn't break row alignment or cause overflow
</verification>

<success_criteria>
- RulesEntryRow component updated with confidence badge rendering
- Confidence field extracted from entry object (when available)
- Badge uses outline style with transparent background and colored border
- Badge positioned flushed right (flex justify-between)
- Color mapping: HIGH→success, MEDIUM→warning, LOW→error
- Badge size matches existing badges (text-[10px])
- Title/description layout unchanged
- Build passes with no regressions
</success_criteria>

<output>
After completion, add entry to .planning/STATE.md Pending Todos section and commit with message:
"Add confidence badge to RulesToolCard entries"
</output>
