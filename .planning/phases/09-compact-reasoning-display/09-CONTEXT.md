# Phase 9: Compact Reasoning Display - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Agent reasoning text renders compactly without overflowing or bloating the trace panel. Tables and codeblocks inside reasoning get compact styling and horizontal scroll instead of expanding the container. No new features — purely CSS/styling changes to existing Streamdown-rendered content within the trace panel.

</domain>

<decisions>
## Implementation Decisions

### Table compacting
- Font size: 10px (smaller than the 11px reasoning text)
- Cell padding: minimal — 2px vertical, 4px horizontal
- Borders: horizontal row dividers only, no vertical cell borders
- Max-height: ~200px with overflow-y scroll for tall tables

### Codeblock overflow
- Horizontal scroll: overflow-x auto with always-visible thin scrollbar
- Font size: 10px (matching tables for consistent compact data treatment)
- Max-height: ~200px with overflow-y scroll (same cap as tables)
- Scrollbar: always visible thin style, not auto-hide

### Visual density
- Background: slightly dimmed background on reasoning blocks to visually separate from task + tool calls
- Max-height: ~400px on the reasoning section with overflow-y scroll
- Default state: open (current behavior preserved)
- Streamdown spacing: tighter — space-y-2 instead of default space-y-4

### Claude's Discretion
- Exact scrollbar CSS (thin scrollbar implementation varies by browser)
- Specific dimmed background color choice (should fit the cyanotype aesthetic)
- Container overflow containment approach (where to apply overflow: hidden/auto to prevent panel width expansion)
- Word-break strategy for long unbroken strings in reasoning text

</decisions>

<specifics>
## Specific Ideas

- Tables and codeblocks should share the same 10px font and ~200px max-height cap for consistency
- The reasoning section gets a larger cap (~400px) since it's the overall container
- Row-lines-only table borders for a lighter, cleaner look

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Streamdown` component (streamdown@2.3.0) with `@streamdown/code` plugin — already used for all markdown rendering in trace panel
- `TRACE_SD_CLASS = 'text-[11px] leading-4'` constant in `trace-event-card.tsx` — central font class for all trace Streamdown instances
- Existing Streamdown CSS overrides in `globals.css` (lines 604-622) — override code block colors, can extend for tables

### Established Patterns
- Streamdown uses `data-streamdown` attributes on child elements — target these for CSS overrides
- All reasoning rendering goes through the `AgentCard` component (`trace-event-card.tsx:720-728`)
- CSS overrides use `!important` to override Streamdown's built-in styles

### Integration Points
- `globals.css` — add new `[data-streamdown]` selectors for table and overflow rules
- `trace-event-card.tsx` — may need wrapper div on reasoning Streamdown for max-height/background
- `TRACE_SD_CLASS` — could be extended or a reasoning-specific class added
- ResizablePanel (65% default, 30% min) — reasoning content must stay within this width

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-compact-reasoning-display*
*Context gathered: 2026-03-02*
