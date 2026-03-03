---
status: complete
phase: 10-structured-data-formatting
source: [10-01-SUMMARY.md, 10-02-SUMMARY.md]
started: 2026-03-03T11:30:00Z
updated: 2026-03-03T11:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Tool call data renders as labeled list
expected: In the dev trace panel, expand a generic tool call card. Input and output should display as stacked key-value rows with labels on the left and values on the right, instead of raw JSON code blocks.
result: pass

### 2. Raw JSON toggle on tool call cards
expected: On a generic tool call card showing labeled data, click the {...} button. The view should toggle between the labeled key-value display and raw JSON code block. Clicking again toggles back.
result: pass

### 3. Custom tool renderers unchanged
expected: VocabularyToolCard, RuleTestCard, and SentenceTestToolCard still render with their custom card formats (not replaced by LabeledList). These specialized cards should look the same as before.
result: pass

### 4. Agent card shows structured output section
expected: Expand an agent card for an agent that produces structured output (e.g., Problem Extractor, Question Answerer). Below the reasoning text, there should be a "Structured Output" section, collapsed by default.
result: pass

### 5. Structured output expands to show labeled data
expected: Click to expand the "Structured Output" section in an agent card. It should reveal a labeled key-value display of the agent's parsed JSON output (e.g., extracted fields, rules, vocabulary entries).
result: pass

### 6. Structured output raw JSON toggle
expected: With structured output expanded, click the {...} button. It should toggle between the labeled view and raw JSON. Clicking again toggles back.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
