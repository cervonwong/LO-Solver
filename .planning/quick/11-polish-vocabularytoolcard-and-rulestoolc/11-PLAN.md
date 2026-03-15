---
phase: quick-11
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/trace/specialized-tools.tsx
autonomous: false
requirements: [QUICK-11]

must_haves:
  truths:
    - "VocabularyToolCard renders as a collapsible with a summary header line and chevron"
    - "RulesToolCard renders as a collapsible with a summary header line and chevron"
    - "Expanding either card reveals indented entries with subtle separators"
    - "Cards with >5 entries show first 3 then a 'N more...' toggle"
    - "Action badges render at 10px matching test cards"
    - "Both cards follow the same structural pattern as SentenceTestToolCard"
  artifacts:
    - path: "src/components/trace/specialized-tools.tsx"
      provides: "Polished VocabularyToolCard and RulesToolCard"
      contains: "CollapsibleTrigger"
  key_links:
    - from: "VocabularyToolCard"
      to: "Collapsible + RawJsonToggle"
      via: "Same pattern as SentenceTestToolCard"
      pattern: "CollapsibleTrigger.*hover-hatch-cyan"
    - from: "RulesToolCard"
      to: "Collapsible + RawJsonToggle"
      via: "Same pattern as SentenceTestToolCard"
      pattern: "CollapsibleTrigger.*hover-hatch-cyan"
---

<objective>
Polish VocabularyToolCard and RulesToolCard to use collapsible header + indented entries pattern matching the existing SentenceTestToolCard/RuleTestCard design language.

Purpose: Both cards currently render flat with no visual hierarchy — entries run together with no separation or collapsibility. The test cards (SentenceTestToolCard, RuleTestCard) already have a polished collapsible pattern that these cards should match.
Output: Visually consistent, collapsible tool cards with proper entry hierarchy and overflow handling.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@DESIGN.md
@src/components/trace/specialized-tools.tsx
@src/components/trace/shared.tsx
@src/components/trace/trace-utils.tsx

<interfaces>
<!-- Key patterns from SentenceTestToolCard to replicate -->

From src/components/trace/shared.tsx:
```typescript
export function ChevronIcon({ open, className }: ChevronIconProps): JSX.Element;
export function RawJsonToggle({ data, children }: RawJsonToggleProps): JSX.Element;
```

From src/components/trace/specialized-tools.tsx (SentenceTestToolCard pattern — lines 231-295):
```typescript
// Pattern: RawJsonToggle wraps Collapsible
// CollapsibleTrigger has hover-hatch-cyan, flex items, Badge + text + ChevronIcon
// CollapsibleContent has forceMount + data-[state=closed]:hidden + pl-6 pr-2 py-1 text-[11px] text-muted-foreground
```

From DESIGN.md:
- Badges: `variant="outline"` with `text-[10px]` and transparent bg
- Separators: `border-border-subtle` for inner dividers
- Surface nesting: surface-1 > surface-2 > surface-3
- Hover: `hover-hatch-cyan` on interactive triggers
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Refactor VocabularyToolCard and RulesToolCard to collapsible pattern with overflow handling</name>
  <files>src/components/trace/specialized-tools.tsx</files>
  <action>
Refactor both VocabularyToolCard and RulesToolCard to match the SentenceTestToolCard collapsible pattern. Apply changes consistently to both cards:

**Structural changes (both cards):**
1. Add `useState(false)` for `open` state (like SentenceTestToolCard)
2. Wrap content in `Collapsible` inside the existing `RawJsonToggle`
3. Create a `CollapsibleTrigger` with class `hover-hatch-cyan flex w-full items-center gap-2 py-0.5 text-left text-xs` containing:
   - The action Badge (bump from `text-[9px]` to `text-[10px]` to match test cards), keep existing color logic
   - Tool name text: derive display name from toolName (e.g. "addVocabulary" -> "addVocabulary"), show as `font-medium`
   - Entry count in parentheses: `(N entries)` in `text-muted-foreground`
   - `ChevronIcon` at the end
4. Move entry rendering into `CollapsibleContent` with `forceMount` and class `data-[state=closed]:hidden pl-6 pr-2 py-1 text-[11px] text-muted-foreground`
5. Add `border-b border-border-subtle last:border-b-0` dividers between entries inside the expanded view

**Overflow strategy (both cards, replacing the old >5 cutoff):**
- Always show up to 3 entries directly
- If entries.length > 3, show first 3 entries + a clickable "N more..." line that expands to show remaining entries
- Use a second `useState(false)` for the "show more" toggle
- The "N more..." toggle should be styled as `text-muted-foreground hover:text-foreground cursor-pointer text-[10px]` with the count like "+ N more..."
- When expanded, show all remaining entries with the same styling

**VocabularyToolCard entry rendering (inside expanded view):**
- Each entry: `foreignForm` in `font-medium text-foreground`, then meaning/type in `text-muted-foreground`
- Keep the existing diff display for updates (arrow notation, strikethrough for previous values) but render inside the indented entry area
- Remove entries (line-through styling) stay as-is but inside the indented layout
- Remove the per-entry Badge — the header Badge already shows the action

**RulesToolCard entry rendering (inside expanded view):**
- Each entry: `title` in `font-medium text-foreground`
- `description` (if present) on a second line, truncated at 80 chars, in `text-muted-foreground`
- Remove entries (line-through styling) stays as-is inside the indented layout
- Remove the per-entry Badge — the header Badge already shows the action

**Do NOT change:** SentenceTestToolCard, RuleTestCard, BulkToolCallGroup, AgentToolCallCard, ToolCallRenderer, or any component props/interfaces. The detection logic in trace-utils.tsx stays the same.
  </action>
  <verify>
    <automated>cd /home/cervo/Code/LO-Solver && npx tsc --noEmit 2>&1 | grep -v "globals.css" | head -20</automated>
  </verify>
  <done>
- VocabularyToolCard renders as collapsible: collapsed shows "[ACTION] addVocabulary (N entries)" with chevron; expanded shows indented entries with border-subtle separators
- RulesToolCard renders as collapsible: collapsed shows "[ACTION] addRules (N entries)" with chevron; expanded shows indented entries with descriptions
- Both cards: >3 entries shows first 3 + "+ N more..." toggle
- Both cards: action badges at text-[10px], outline variant, transparent bg
- Both cards: hover-hatch-cyan on trigger, forceMount on content
- TypeScript compiles without new errors
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Visual verification of polished cards</name>
  <what-built>Polished VocabularyToolCard and RulesToolCard with collapsible headers, indented entries, overflow handling, and consistent styling matching the test card pattern.</what-built>
  <how-to-verify>
    1. Run a solve in the app at http://localhost:3000
    2. Open the DevTracePanel to see tool call events
    3. Find vocabulary tool calls (addVocabulary, updateVocabulary, removeVocabulary) — verify:
       - Collapsed: shows action badge + tool name + "(N entries)" + chevron
       - Click to expand: entries appear indented with subtle separators
       - If >3 entries: first 3 shown + "+ N more..." toggle works
       - Update entries show arrow diff notation
       - Remove entries show strikethrough
    4. Find rules tool calls (addRules, updateRules, removeRules) — verify same pattern:
       - Collapsed summary header, expand to see titles + descriptions
       - Overflow toggle works for >3 entries
    5. Verify badges are 10px, outline, matching test cards
    6. Verify RawJsonToggle ({...} button) still works on both card types
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (ignoring pre-existing globals.css error)
- Visual inspection confirms both cards match SentenceTestToolCard pattern
- Collapsible expand/collapse works on both cards
- Overflow "+ N more..." toggle works when entries > 3
</verification>

<success_criteria>
Both VocabularyToolCard and RulesToolCard visually match the collapsible pattern of SentenceTestToolCard/RuleTestCard, with proper hierarchy (summary header -> indented entries), overflow handling (3 shown + toggle), and DESIGN.md conventions (10px badges, hover-hatch-cyan triggers, border-subtle separators).
</success_criteria>

<output>
After completion, create `.planning/quick/11-polish-vocabularytoolcard-and-rulestoolc/11-SUMMARY.md`
</output>
