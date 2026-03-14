---
phase: quick-4
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/trace/specialized-tools.tsx
autonomous: true
requirements: [QUICK-4]
must_haves:
  truths:
    - "testRule tool calls show PASS/FAIL badge based on result.passed and display reasoning when expanded"
    - "testSentence tool calls show PASS/FAIL badge based on result.passed and display translation, reasoning, and match status when expanded"
    - "Error-case tool calls (success=false) show an error indicator and error message"
  artifacts:
    - path: "src/components/trace/specialized-tools.tsx"
      provides: "Fixed SentenceTestToolCard with correct field names"
  key_links:
    - from: "src/components/trace/specialized-tools.tsx"
      to: "src/mastra/workflow/03a-sentence-tester-tool.ts"
      via: "result field names in emitted tool-call events"
      pattern: "result\\.(translation|reasoning|matchesExpected|expectedTranslation)"
---

<objective>
Fix the SentenceTestToolCard component so it reads the correct fields from testSentence/testSentenceWithRuleset tool-call results.

Purpose: The current SentenceTestToolCard reads `result.details`, `result.expected`, and `result.actual` -- none of which exist in the actual tool output. The real fields are `result.reasoning`, `result.translation`, `result.expectedTranslation`, and `result.matchesExpected`. This means the accordion content is always empty.

Output: Working SentenceTestToolCard that shows meaningful content when expanded.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@DESIGN.md
@src/components/trace/specialized-tools.tsx

<interfaces>
<!-- The actual output schemas from the backend tools that get cast to Record<string, unknown> and emitted as tool-call event results -->

From src/mastra/workflow/03a-rule-tester-tool.ts:
The tool emits two events per call. The completion event has:
```typescript
// Success case:
result: { success: true, passed: boolean, reasoning: string }
// Error case:
result: { success: false, error: string }
```

From src/mastra/workflow/03a-sentence-tester-tool.ts:
The tool emits two events per call. The completion event has:
```typescript
// Success case:
result: {
  success: true,
  passed: boolean,           // Agent's judgment: can sentence be translated?
  translation: string,       // The attempted translation
  reasoning: string,         // Step-by-step explanation
  matchesExpected: boolean | null,  // Does translation match expected? (null if no expected provided)
  expectedTranslation: string | null  // The expected translation for reference
}
// Error case:
result: { success: false, error: string }
```

The tool input events have:
- testSentence: `input: { id, content }`
- testSentenceWithRuleset: `input: { id, content, rulesetCount }`

The "started" intermediate events have `result: { status: 'started', subAgent: '...' }` and are already filtered out by `isStartedStatus()`.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix SentenceTestToolCard field names and add match status</name>
  <files>src/components/trace/specialized-tools.tsx</files>
  <action>
Update the `SentenceTestToolCard` component (around line 136) to read the correct fields from the tool result:

1. **PASS/FAIL badge**: Keep using `result.passed` -- this is already correct. This represents the agent's judgment on whether the sentence can be confidently translated using the ruleset.

2. **Header line**: Keep showing `Sentence {sentenceId}` from `input.id`. Also add a secondary indicator for `matchesExpected` when it is not null: if `matchesExpected === true`, show nothing extra (pass is sufficient); if `matchesExpected === false`, show a small "mismatch" badge in `border-status-warning text-status-warning` to indicate the translation didn't literally match the expected answer even though the agent judged it passable (or vice versa).

3. **Accordion expanded content**: Replace the current broken field reads with:
   - **Translation**: Show `result.translation` (the attempted translation). Label it "Translation:" in font-medium.
   - **Expected**: Show `result.expectedTranslation` (NOT `result.expected`) when not null. Label it "Expected:" in font-medium.
   - **Match indicator**: When `matchesExpected` is not null, show whether the translation matched. If `matchesExpected === true`, show a small green checkmark or "Match" text. If false, show a small red "Mismatch" indicator.
   - **Reasoning**: Show `result.reasoning` (NOT `result.details`). This replaces the old `details` field.

4. **Error case**: When `result.success === false`, show the error message from `result.error` instead of the normal content. Use `border-status-error` styling for the badge showing "ERROR" instead of PASS/FAIL.

5. **Sentence label**: Extract `sentenceId` from `input.id` (already correct) but also show the sentence content from `input.content` as a truncated subtitle in the header when collapsed.

Follow DESIGN.md conventions: outline badges with transparent bg, 10px text size, status-success/status-error colors.
  </action>
  <verify>npx tsc --noEmit 2>&1 | grep -v "globals.css" | head -20</verify>
  <done>SentenceTestToolCard reads `result.reasoning`, `result.translation`, `result.expectedTranslation`, and `result.matchesExpected` (correct field names). Accordion shows translation, expected translation, match status, and reasoning. Error cases display error message. RuleTestCard remains unchanged (already correct).</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes (ignoring pre-existing globals.css error)
- Visual inspection: run the app, trigger a workflow, expand a testSentence tool call in the trace panel -- translation, expected, match status, and reasoning should all render correctly
</verification>

<success_criteria>
- SentenceTestToolCard shows translation and reasoning when expanded (not empty)
- PASS/FAIL badge correctly reflects `result.passed`
- Match status indicator visible when `matchesExpected` is not null
- Error cases show error message
- No TypeScript errors introduced
</success_criteria>

<output>
After completion, create `.planning/quick/4-fix-tool-rendering-for-testsentence-and-/4-SUMMARY.md`
</output>
