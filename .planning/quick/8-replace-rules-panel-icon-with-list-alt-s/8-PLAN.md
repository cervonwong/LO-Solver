---
phase: quick-8
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/rules-panel.tsx
autonomous: true
requirements:
  - QUICK-8
must_haves:
  truths:
    - "Rules panel header displays the list_alt Material Icon instead of the previous list icon"
  artifacts:
    - path: "src/components/rules-panel.tsx"
      provides: "Rules panel with updated header icon"
      contains: "M293.85-298.46h61.53"
  key_links: []
---

<objective>
Replace the SVG icon in the Rules panel header with the list_alt Material Icon.

Purpose: Update the Rules panel header icon to use the list_alt icon for better visual clarity.
Output: Modified `src/components/rules-panel.tsx` with new SVG path.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/rules-panel.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace Rules panel header SVG path with list_alt icon</name>
  <files>src/components/rules-panel.tsx</files>
  <action>
In `src/components/rules-panel.tsx`, replace the `<path>` element inside the header SVG (lines 108) with the new list_alt path. The current path is:

```
<path d="M320-280q17 0 28.5-11.5T360-320q0-17-11.5-28.5T320-360q-17 0-28.5 11.5T280-320q0 17 11.5 28.5T320-280Zm0-160q17 0 28.5-11.5T360-480q0-17-11.5-28.5T320-520q-17 0-28.5 11.5T280-480q0 17 11.5 28.5T320-440Zm0-160q17 0 28.5-11.5T360-640q0-17-11.5-28.5T320-680q-17 0-28.5 11.5T280-640q0 17 11.5 28.5T320-600Zm120 320h240v-40H440v40Zm0-160h240v-40H440v40Zm0-160h240v-40H440v40ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Z" />
```

Replace it with:

```
<path d="M293.85-298.46h61.53V-360h-61.53v61.54Zm0-150.77h61.53v-61.54h-61.53v61.54Zm0-150.77h61.53v-61.54h-61.53V-600Zm153.84 290.77h215.39v-40H447.69v40Zm0-150.77h215.39v-40H447.69v40Zm0-150.77h215.39v-40H447.69v40ZM160-160v-640h640v640H160Zm40-40h560v-560H200v560Zm0 0v-560 560Z" />
```

Keep all other SVG attributes unchanged: `xmlns`, `height="16"`, `viewBox="0 -960 960 960"`, `width="16"`, `fill="currentColor"`, `className="shrink-0"`.
  </action>
  <verify>
    <automated>grep -q "M293.85-298.46h61.53" src/components/rules-panel.tsx && echo "PASS: list_alt path found" || echo "FAIL: list_alt path not found"</automated>
  </verify>
  <done>The Rules panel header SVG uses the list_alt Material Icon path. All other SVG attributes (height, width, viewBox, fill, className) remain unchanged.</done>
</task>

</tasks>

<verification>
- `grep "M293.85-298.46" src/components/rules-panel.tsx` returns the new path
- `grep "M320-280q17" src/components/rules-panel.tsx` returns nothing (old path removed)
- `npx tsc --noEmit` passes (ignoring the known globals.css error)
</verification>

<success_criteria>
The Rules panel header icon displays the list_alt Material Icon SVG. The file compiles without errors.
</success_criteria>

<output>
After completion, create `.planning/quick/8-replace-rules-panel-icon-with-list-alt-s/8-SUMMARY.md`
</output>
