# Quick Task 11: Polish VocabularyToolCard and RulesToolCard visual design - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Task Boundary

Polish VocabularyToolCard and RulesToolCard visual design in `src/components/trace/specialized-tools.tsx`. Both cards display vocabulary/rules CRUD operations in the trace panel but currently render flat with no hierarchy — entries run together visually with the header.

</domain>

<decisions>
## Implementation Decisions

### Entry Layout Style
- Use collapsible header + indented entries pattern (matching SentenceTestToolCard/RuleTestCard)
- Header shows: [ACTION] toolName (N entries) with chevron
- Expand reveals individual entries indented, lighter text, with subtle separators between them
- When collapsed, shows just the summary line (action badge + count)

### Overflow Strategy (>5 entries)
- Show first 3 entries + "N more..." collapsible toggle
- Gives a preview while staying compact
- Replace the current hard cutoff that shows "N entries" with zero detail

### Badge Sizing and Contrast
- Bump action badges from 9px to 10px outline to match test cards (SentenceTestToolCard, RuleTestCard)
- Keep existing status color mappings (success/warning/error for add/update/remove)
- Transparent background, outline variant — per DESIGN.md conventions

### Claude's Discretion
- Exact separator styling (border-border-subtle dividers between entries)
- Text sizing for entry details within expanded view
- Whether to show rule descriptions on 1 or 2 lines in expanded view

</decisions>

<specifics>
## Specific Ideas

- Match the pattern from SentenceTestToolCard: Collapsible with hover-hatch-cyan trigger, forceMount content with data-[state=closed]:hidden, indented content area
- Entries should use lighter text (text-muted-foreground) for descriptions, font-medium for titles/foreignForms
- For vocabulary updates with previous values, keep the arrow diff display but inside the indented entry
- The RawJsonToggle should wrap the entire collapsible (as it does for test cards)
- Both cards share the same structure so improvements must be applied consistently

</specifics>
