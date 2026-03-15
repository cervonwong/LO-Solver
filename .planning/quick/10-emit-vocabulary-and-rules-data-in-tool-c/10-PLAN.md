---
phase: quick-10
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/mastra/workflow/vocabulary-tools.ts
  - src/mastra/workflow/rules-tools.ts
  - src/components/trace/trace-utils.tsx
  - src/components/trace/specialized-tools.tsx
autonomous: true
requirements: [QUICK-10]

must_haves:
  truths:
    - "Vocabulary tool call cards (addVocabulary, updateVocabulary, removeVocabulary) display the actual entries that were added, updated, or removed"
    - "Rules tool call cards (addRules, updateRules, removeRules) display the actual rules that were added, updated, or removed"
    - "Existing UI rendering for other tool calls (testRule, testSentence, etc.) is unaffected"
  artifacts:
    - path: "src/mastra/workflow/vocabulary-tools.ts"
      provides: "data-tool-call events with full entries in input field"
    - path: "src/mastra/workflow/rules-tools.ts"
      provides: "data-tool-call events with full entries in input field"
    - path: "src/components/trace/trace-utils.tsx"
      provides: "hasRulesEntries() detection function"
    - path: "src/components/trace/specialized-tools.tsx"
      provides: "RulesToolCard component for rendering rules CRUD tool calls"
  key_links:
    - from: "src/mastra/workflow/vocabulary-tools.ts"
      to: "src/components/trace/specialized-tools.tsx"
      via: "data-tool-call event payload with input.entries / input.foreignForms"
      pattern: "input:.*entries"
    - from: "src/mastra/workflow/rules-tools.ts"
      to: "src/components/trace/specialized-tools.tsx"
      via: "data-tool-call event payload with input.entries / input.titles"
      pattern: "input:.*entries"
---

<objective>
Include actual vocabulary/rules data in tool call events so the frontend can display what was added, updated, or removed.

Purpose: The UI tool call cards for vocabulary and rules CRUD operations currently show only counts (e.g., "count: 3") because the `data-tool-call` events emit `input: { count }` instead of the actual entries. The VocabularyToolCard component already exists but is inert because the data is missing. This task wires the data through and adds equivalent UI for rules tools.

Output: Tool call events carry full entry data; VocabularyToolCard activates; new RulesToolCard renders rules CRUD operations.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md

<interfaces>
<!-- Key types and contracts the executor needs -->

From src/lib/workflow-events.ts (ToolCallEvent shape):
```typescript
export interface ToolCallEvent {
  type: 'data-tool-call';
  data: {
    id: string;
    parentId: string;
    stepId: StepId;
    toolName: string;
    input: Record<string, unknown>;
    result: Record<string, unknown>;
    timestamp: string;
  };
}
```

From src/mastra/workflow/vocabulary-tools.ts (VocabularyEntry shape):
```typescript
export const vocabularyEntrySchema = z.object({
  foreignForm: z.string(),
  meaning: z.string(),
  type: z.string(),
  notes: z.string(),
});
export type VocabularyEntry = z.infer<typeof vocabularyEntrySchema>;
```

From src/mastra/workflow/workflow-schemas.ts (Rule shape):
```typescript
// ruleSchema has: title, description, confidence (optional)
```

From src/components/trace/trace-utils.tsx (detection functions):
```typescript
export function hasVocabularyEntries(toolCall: ToolCallEvent): boolean {
  // Checks toolName is addVocabulary/updateVocabulary/removeVocabulary
  // AND input.entries or input.foreignForms is a non-empty array
}
```

From src/components/trace/specialized-tools.tsx:
```typescript
// Line 16-18 comment: "INERT: Tool-call events currently emit `input: { count }`,
// not the actual entries array. This card activates when events carry `input.entries`"
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Include actual entries data in vocabulary and rules tool call events</name>
  <files>src/mastra/workflow/vocabulary-tools.ts, src/mastra/workflow/rules-tools.ts</files>
  <action>
In `vocabulary-tools.ts`, change the `data-tool-call` event emission in each tool to include the actual data instead of just a count:

**addVocabulary** (line ~118-124): Change `input: { count: entries.length }` to `input: { entries: addedEntries }`. The `addedEntries` array is already collected (line 83) with full VocabularyEntry objects.

**updateVocabulary** (line ~193-199): Change `input: { count: entries.length }` to `input: { entries: updatedEntries }`. The `updatedEntries` array is already collected (line 158).

**removeVocabulary** (line ~262-270): Change `input: { count: foreignForms.length }` to `input: { foreignForms: removedForms }`. The `removedForms` string array is already collected (line 230). Keep as `foreignForms` (not `entries`) since this tool takes string keys, not full entry objects -- the UI `hasVocabularyEntries()` check already handles both `input.entries` and `input.foreignForms`.

**clearVocabulary** (line ~313-320): Change `input: {}` to `input: { action: 'clear' }`. No entries to show but add action for clarity.

In `rules-tools.ts`, make the same pattern of changes:

**addRules** (line ~93-101): Change `input: { count: entries.length }` to `input: { entries: addedEntries }`. The `addedEntries` array is already collected (line 64).

**updateRules** (line ~161-169): Change `input: { count: entries.length }` to `input: { entries: updatedEntries }`. The `updatedEntries` array is already collected (line 132).

**removeRules** (line ~224-232): Change `input: { count: titles.length }` to `input: { titles: removedTitles }`. The `removedTitles` string array is already collected (line 196).

**clearRules** (line ~270-278): Change `input: {}` to `input: { action: 'clear' }`.

Also remove the "INERT" comment block (lines 16-18) in `specialized-tools.tsx` since the card will now be active.
  </action>
  <verify>npx tsc --noEmit 2>&1 | grep -v "Cannot find module './globals.css'" | head -20</verify>
  <done>All vocabulary and rules tool call events include the actual entries/foreignForms/titles data in the input field instead of just counts</done>
</task>

<task type="auto">
  <name>Task 2: Add rules tool call detection and RulesToolCard UI component</name>
  <files>src/components/trace/trace-utils.tsx, src/components/trace/specialized-tools.tsx</files>
  <action>
In `trace-utils.tsx`:
1. Add a `hasRulesEntries()` function following the same pattern as `hasVocabularyEntries()`:
   ```typescript
   export function hasRulesEntries(toolCall: ToolCallEvent): boolean {
     if (!['addRules', 'updateRules', 'removeRules'].includes(toolCall.data.toolName)) {
       return false;
     }
     const entries = toolCall.data.input.entries ?? toolCall.data.input.titles;
     return Array.isArray(entries) && entries.length > 0;
   }
   ```

In `specialized-tools.tsx`:
1. Import `hasRulesEntries` from `./trace-utils`.

2. Create a `RulesToolCard` component following the `VocabularyToolCard` pattern but adapted for rules:
   - Extract action from toolName: `toolCall.data.toolName.replace('Rules', '').toUpperCase()`
   - Extract entries from `toolCall.data.input.entries` (for add/update -- these are Rule objects with `title`, `description`) or `toolCall.data.input.titles` (for remove -- string array)
   - Determine `isUpdate` (toolName === 'updateRules') and `isRemove` (toolName === 'removeRules')
   - For <= 5 entries: render each with a colored badge (green for ADD, yellow for UPDATE, red for REMOVE) and the rule title + truncated description
   - For > 5 entries: show summary "{N} entries" with appropriate badge
   - Wrap in `<RawJsonToggle data={toolCall.data}>` like VocabularyToolCard

   Specific rendering per entry:
   - Badge: same color logic as VocabularyToolCard (ADD=success, UPDATE=warning, REMOVE=error)
   - Title: `<span className="font-medium">{title}</span>`
   - For add/update: show description truncated to ~80 chars after the title in muted text
   - For remove: apply `line-through text-muted-foreground` class

3. In `ToolCallRenderer`, add a check for `hasRulesEntries(toolCall)` BEFORE the `hasVocabularyEntries` check (order does not matter since tool names are disjoint, but keep it grouped logically):
   ```typescript
   if (hasRulesEntries(toolCall)) {
     return <RulesToolCard toolCall={toolCall} />;
   }
   ```
  </action>
  <verify>npx tsc --noEmit 2>&1 | grep -v "Cannot find module './globals.css'" | head -20</verify>
  <done>Rules CRUD tool calls render with a specialized RulesToolCard showing rule titles and descriptions. Vocabulary tool calls render with the now-active VocabularyToolCard showing foreignForm, meaning, and type. Both fall back to summary counts when > 5 entries.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (ignoring the pre-existing globals.css error)
- Vocabulary tools (addVocabulary, updateVocabulary, removeVocabulary, clearVocabulary) emit `data-tool-call` events with actual entries data in `input`
- Rules tools (addRules, updateRules, removeRules, clearRules) emit `data-tool-call` events with actual entries data in `input`
- `hasVocabularyEntries()` returns true for vocabulary tool call events (activating VocabularyToolCard)
- `hasRulesEntries()` returns true for rules tool call events (activating RulesToolCard)
- ToolCallRenderer routes to the correct specialized card for each tool type
</verification>

<success_criteria>
When the solver runs, vocabulary and rules CRUD tool call cards in the trace panel display the actual entries (foreignForm/meaning for vocabulary, title/description for rules) instead of just showing "count: N".
</success_criteria>

<output>
After completion, create `.planning/quick/10-emit-vocabulary-and-rules-data-in-tool-c/10-SUMMARY.md`
</output>
