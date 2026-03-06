# Phase 17: Key Entry UI - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can store their OpenRouter API key in the browser and see its status at a glance. Nav bar button opens a dialog for entering, updating, and clearing the key with localStorage persistence. Key routing (Phase 18) is separate.

</domain>

<decisions>
## Implementation Decisions

### CreditsBadge coexistence
- CreditsBadge always shows regardless of key source
- CreditsBadge becomes the clickable trigger for the API key dialog (no separate button)
- Two-row layout within the same clickable area:
  - **Top row:** Key icon + short status text
  - **Bottom row:** `$X.XX left` (existing credits display)
- When key is set: key icon (cyan) + `sk-...xyz` (last 4 chars)
- When no key: key icon (muted) + `Add key`

### Key status indicator
- Same key icon in both states, color change only
- Cyan when key is configured, muted-foreground when not
- `hover-hatch-cyan` class on the whole clickable area
- `cursor-pointer` to reinforce clickability

### Dialog content & behavior
- API key input is always visible (no password masking)
- When dialog opens with existing key: show masked preview (`sk-...last4`) as read-only; "Edit" button clears preview and shows empty input for new key
- Three buttons: Save, Clear, Cancel
- Clear requires confirmation before removing key from localStorage
- Dialog title and styling follow existing abort dialog pattern (stamp aesthetic)

### Nav bar placement
- Replaces current CreditsBadge position (between mode toggle divider and abort button divider)
- Always accessible during active solve (not disabled like sliders/mode toggle)
- Keep existing dividers on both sides of the block
- Both rows left-aligned within the block

### Claude's Discretion
- Dialog title text and description copy
- Confirmation UI for clear action (inline or sub-dialog)
- Key icon SVG choice
- Input placeholder text
- Exact spacing between the two rows

</decisions>

<specifics>
## Specific Ideas

- Two-row stacked layout inside the CreditsBadge area is a compact way to add key status without growing the nav bar
- Masked preview with "Edit" button prevents accidental key overwrites while keeping the dialog simple
- "Add key" as the empty-state text is action-oriented, hinting at what clicking will do

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CreditsBadge` (`src/components/credits-badge.tsx`): Current credits display component — will be extended or wrapped to add key status row and click-to-open behavior
- `Dialog` / `DialogContent` / `DialogHeader` / `DialogFooter` (`src/components/ui/dialog.tsx`): shadcn dialog already installed and used for abort confirmation
- `use-model-mode.ts` (`src/hooks/use-model-mode.ts`): localStorage + `useSyncExternalStore` + cross-tab sync pattern — reuse for `useApiKey` hook
- `hover-hatch-cyan` CSS class: existing hover effect for interactive elements

### Established Patterns
- localStorage hooks use `useSyncExternalStore` with `StorageEvent` for cross-tab sync and manual dispatch for same-tab reactivity
- Nav bar buttons follow `stamp-btn-nav-*` class patterns
- Dialog styling: dark background variant, stamp-style title, `DialogFooter` with gap-2
- Constants use `UPPER_SNAKE_CASE` (e.g., `STORAGE_KEY`)

### Integration Points
- `layout-shell.tsx` NavBar component: CreditsBadge is rendered inline — dialog state and trigger will be added here or in the extended CreditsBadge component
- No shadcn `Input` component installed yet — may need `npx shadcn@latest add input`
- Credits API (`/api/credits`): continues to work as-is; key management is client-side only

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-key-entry-ui*
*Context gathered: 2026-03-06*
