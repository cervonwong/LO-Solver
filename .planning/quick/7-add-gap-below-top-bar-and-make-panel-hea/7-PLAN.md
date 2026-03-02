---
phase: quick-7
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/layout.tsx
  - src/components/dev-trace-panel.tsx
autonomous: true
must_haves:
  truths:
    - "Visible gap separates the top nav bar from the panel content below"
    - "Lex's Solving Process header stays visible when scrolling trace events"
    - "Vocabulary header stays visible when scrolling vocabulary entries"
    - "Rules header stays visible when scrolling rules entries"
  artifacts:
    - path: "src/app/layout.tsx"
      provides: "Gap between nav and main content"
      contains: "gap-"
    - path: "src/components/dev-trace-panel.tsx"
      provides: "Sticky trace panel header"
      contains: "sticky"
  key_links: []
---

<objective>
Add a gap between the top navigation bar and the panels below it, and make all three panel headers (Lex's Solving Process, Vocabulary, Rules) sticky so they remain visible when scrolling panel content.

Purpose: Visual separation between nav and content, and persistent panel headers for orientation during long scroll sessions.
Output: Updated layout.tsx and dev-trace-panel.tsx.
</objective>

<execution_context>
@./CLAUDE.md
@./DESIGN.md
</execution_context>

<context>
@src/app/layout.tsx
@src/app/page.tsx
@src/components/dev-trace-panel.tsx
@src/components/vocabulary-panel.tsx
@src/components/rules-panel.tsx

Scroll structure analysis:

- **Layout** (`layout.tsx`): `<body>` is `flex h-full flex-col`. `<nav>` is `shrink-0`. `<main>` is `min-h-0 flex-1`. No gap between them currently.

- **DevTracePanel** (`dev-trace-panel.tsx`): Rendered inside a `<ScrollArea className="h-full">` wrapper in `page.tsx` (line 709). The header div (line 100) is at the top of the panel but scrolls with content because the outer ScrollArea wraps the entire panel. The panel also has its own inner scroll container with `overflow-y-auto` (line 124) which is redundant when the outer ScrollArea is active. Fix: make header `sticky top-0 z-10` within the outer ScrollArea.

- **VocabularyPanel** (`vocabulary-panel.tsx`): Outer div is `flex h-full flex-col`. Header is `shrink-0`. Content is in `<ScrollArea className="min-h-0 flex-1">`. Header is ALREADY pinned -- it does not scroll. No change needed.

- **RulesPanel** (`rules-panel.tsx`): Same flex-col + shrink-0 header + ScrollArea content structure. Header is ALREADY pinned. No change needed.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add nav-to-content gap and make trace panel header sticky</name>
  <files>src/app/layout.tsx, src/components/dev-trace-panel.tsx</files>
  <action>
Two changes:

1. **layout.tsx** -- Add a gap between the nav bar and main content area.
   On the `<body>` tag (line 30), add `gap-1` to the existing className to introduce a 4px (0.25rem) gap between the nav and main. This is a subtle visual separation that aligns with the blueprint grid aesthetic.
   The body className becomes: `"flex h-full flex-col gap-1 bg-background font-sans text-foreground antialiased"`

2. **dev-trace-panel.tsx** -- Make the "Lex's Solving Process" header sticky within its scroll container.
   On the header div (line 100), add `sticky top-0 z-10` to the existing className so it pins to the top of the scroll area when content scrolls.
   The header className becomes: `"frosted sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-border px-4 py-2"`

   The `frosted` class already provides a `backdrop-filter: blur(2px)` and `surface-1` background, so the header will have proper visual coverage over scrolling content beneath it.

No changes needed to vocabulary-panel.tsx or rules-panel.tsx -- their headers are already pinned because they sit outside their respective ScrollArea components.
  </action>
  <verify>
    <automated>cd /home/cervo/Code/LO-Solver && npx tsc --noEmit 2>&1 | grep -v "globals.css" | head -20</automated>
  </verify>
  <done>
    - 4px gap visible between the nav bar and the main panel area
    - The "Lex's Solving Process" header stays pinned at the top of the trace panel when scrolling through trace events
    - Vocabulary and Rules headers continue to stay pinned (no regression)
    - TypeScript compiles without new errors
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes (ignoring pre-existing globals.css error)
2. Visual: gap visible between nav bar and panels below
3. Visual: scroll the trace panel -- header stays pinned
4. Visual: scroll vocabulary/rules panels -- headers stay pinned (no regression)
</verification>

<success_criteria>
- Gap between nav and content is visible
- All three panel headers remain visible when their content scrolls
- No TypeScript errors introduced
</success_criteria>

<output>
After completion, update `.planning/STATE.md` quick tasks table with this entry.
</output>
