---
phase: quick-21
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/problem-input.tsx
autonomous: true
requirements: [QUICK-21]
must_haves:
  truths:
    - "When textarea is empty, centered overlay shows 'Paste a linguistics olympiad problem here', 'or', and a 'Choose from our examples' button"
    - "Clicking the 'Choose from our examples' button opens the existing combobox popover"
    - "Clicking anywhere else in the textarea area focuses the textarea"
    - "When textarea has content, a delete icon appears in the top-right corner"
    - "Clicking the delete icon clears the text, resets selectedExample, and shows the overlay"
    - "The separate 'Load example:' row above the textarea no longer exists"
  artifacts:
    - path: "src/components/problem-input.tsx"
      provides: "Combined problem input with overlay empty state and clear button"
      contains: "pointer-events-none"
  key_links:
    - from: "overlay button"
      to: "Popover combobox"
      via: "setComboOpen(true)"
      pattern: "setComboOpen"
    - from: "clear button"
      to: "textarea state"
      via: "setProblemText('')"
      pattern: "setProblemText.*''"
---

<objective>
Merge the "Load example:" combobox row and textarea placeholder into a single combined input area with an overlay empty state and a clear button.

Purpose: Cleaner, more integrated problem input UX — the example chooser lives inside the textarea area rather than as a separate row above it.
Output: Updated `src/components/problem-input.tsx` with overlay + clear button.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./DESIGN.md
@./src/components/problem-input.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Refactor ProblemInput with overlay empty state and clear button</name>
  <files>src/components/problem-input.tsx</files>
  <action>
Modify `src/components/problem-input.tsx` to replace the separate "Load example:" row + textarea placeholder with a combined overlay + clear button design. All changes are in this single file.

**Remove:**
1. The "Load example:" combobox row (the `div.flex.items-center.gap-2` wrapper at lines 84-131 containing the span and Popover)
2. The `placeholder` attribute from the Textarea element
3. The outer `gap-5` flex column wrapper that separated the combobox row from the textarea — keep the textarea and solve button in a `flex flex-col gap-5` but without the combobox row

**Add overlay when textarea is empty (`!problemText.trim()` and not loading):**
- Inside the existing `div.relative` that wraps the textarea, add a div overlay
- The overlay container: `absolute inset-0 flex flex-col items-center justify-center pointer-events-none` (no background — the textarea bg-surface-2 shows through)
- Inside the overlay:
  - `<p className="text-sm text-muted-foreground">Paste a linguistics olympiad problem here</p>`
  - `<p className="text-xs text-muted-foreground mt-1">or</p>`
  - The "Choose from our examples" button with `className="pointer-events-auto mt-2 hover-hatch-cyan border border-border bg-surface-2 px-3 py-1.5 text-xs uppercase tracking-wider text-muted-foreground"` — on click, call `setComboOpen(true)`
- The Popover/Command combobox moves to be rendered at the root level of the component return (outside the relative wrapper, but still inside the component). The PopoverTrigger should be a hidden element or use an anchor approach. Implementation: Keep the Popover with `open={comboOpen}` and `onOpenChange={setComboOpen}`, but instead of the old trigger button, use the overlay button to set `comboOpen` to true. For the PopoverTrigger, use a zero-size invisible anchor `<PopoverTrigger asChild><span className="absolute left-1/2 top-1/2" /></PopoverTrigger>` positioned inside the relative wrapper so the popover appears centered over the textarea. The PopoverContent remains unchanged.

**Add clear button when textarea has content (`problemText.trim()`):**
- Inside the `div.relative` wrapper, add a button: `absolute top-2 right-2 z-10`
- Button className: `text-muted-foreground hover-hatch-cyan p-1 border border-transparent hover:border-border`
- `title="Clear input"` for tooltip
- Contains a Material Symbols `delete` SVG icon at 18x18, using `fill="currentColor"` and `viewBox="0 -960 960 960"`
- The SVG path for the Material Symbols "delete" icon (outlined weight 300): `M312.31-140q-29.92 0-51.12-21.19Q240-182.39 240-212.31V-720h-40v-40h160v-30.77h240V-760h160v40h-40v507.69q0 30.31-21 51.31T647.69-140H312.31ZM680-720H280v507.69q0 14.54 9.23 23.77 9.23 9.23 23.08 9.23h335.38q12.31 0 22.31-10t10-22.69V-720ZM376.16-280h40v-360h-40v360Zm167.68 0h40v-360h-40v360ZM280-720v540-540Z`
- On click: `setProblemText(''); setSelectedExample(''); onTextChange?.(false);`
- Only render when `problemText.trim()` is truthy and not `isDisabled`

**Textarea click focus:**
- The overlay is `pointer-events-none` so clicks pass through to the textarea naturally
- The button inside the overlay has `pointer-events-auto` to be clickable

**Keep intact:**
- The loading overlay (plotter animation)
- The solve button at the bottom
- All existing state variables and handlers (handleExampleSelect, handleSubmit, grouped, groupLabels, groupOrder)
- The `isDisabled` logic
  </action>
  <verify>
    <automated>cd /home/cervo/Code/LO-Solver && npx tsc --noEmit 2>&1 | grep -v "globals.css"</automated>
  </verify>
  <done>
- When textarea is empty: overlay shows "Paste a linguistics olympiad problem here", "or", and a "Choose from our examples" button centered in the textarea area
- The "Choose from our examples" button opens the existing Popover/Command combobox
- Clicking anywhere else in the textarea focuses the textarea (pointer-events-none overlay)
- When textarea has content: a delete icon appears in the top-right corner with "Clear input" tooltip
- Clicking the delete icon clears text, resets selectedExample, and shows the overlay again
- The separate "Load example:" row above the textarea is gone
- No native placeholder attribute on the textarea
- Loading overlay still works
- Solve button still works
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes (ignoring pre-existing globals.css error)
2. Visual: empty textarea shows centered overlay with example chooser button
3. Visual: clicking "Choose from our examples" opens the combobox popover
4. Visual: selecting an example loads text and hides overlay
5. Visual: clear button appears when text is present, clears on click
6. Visual: clicking in the textarea area (not on button) focuses the textarea
</verification>

<success_criteria>
- The "Load example:" combobox row is removed
- Empty state shows overlay with text and example chooser button
- Content state shows clear button in top-right
- All existing functionality preserved (example loading, solve, loading state)
- TypeScript compiles without new errors
</success_criteria>

<output>
After completion, create `.planning/quick/21-combined-problem-input-with-embedded-exa/21-SUMMARY.md`
</output>
