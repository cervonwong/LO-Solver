---
phase: 17-key-entry-ui
verified: 2026-03-06T09:35:00Z
status: human_needed
score: 11/11 must-haves verified
human_verification:
  - test: "Visual appearance and layout of the two-row CreditsBadge in the nav bar"
    expected: "Key icon + status text on top row, credits amount on bottom row; icon and text are cyan when a key is stored and muted when no key"
    why_human: "CSS class behavior (hover-hatch-cyan, conditional text-accent/text-muted-foreground) and SVG icon rendering cannot be verified programmatically"
  - test: "End-to-end API key entry, persistence, and cross-tab sync"
    expected: "Key entered in dialog persists after page reload and appears as masked preview (sk-...XXXX); cross-tab update fires when key changes in another tab"
    why_human: "localStorage persistence across reload and real browser StorageEvent cross-tab sync require live browser execution"
  - test: "Dialog open/close flow from nav bar click"
    expected: "Clicking the CreditsBadge button opens the ApiKeyDialog; Cancel closes it without changes; Save/Clear close it with the respective effect"
    why_human: "Interactive dialog open/close and state transitions require real browser execution"
---

# Phase 17: Key Entry UI Verification Report

**Phase Goal:** Deliver the key-entry UI: a nav-bar dialog where users can enter, view (masked), edit, and clear their OpenRouter API key, persisted in localStorage.
**Verified:** 2026-03-06T09:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | useApiKey hook reads and writes API key to localStorage | VERIFIED | `use-api-key.ts` lines 9, 26-28: `localStorage.getItem/setItem/removeItem(STORAGE_KEY)` |
| 2 | useApiKey hook syncs across tabs via StorageEvent | VERIFIED | `use-api-key.ts` line 31: `window.dispatchEvent(new StorageEvent('storage', ...))` for same-tab; subscribe() on line 16-18 listens for cross-tab events |
| 3 | API key dialog displays masked preview of existing key with Edit button | VERIFIED | `api-key-dialog.tsx` lines 89-97: `apiKey && !isEditing` branch shows `maskKey(apiKey)` + Edit button; `maskKey()` returns `sk-...{last4}` for keys >= 8 chars |
| 4 | API key dialog allows entering a new key and saving it | VERIFIED | `api-key-dialog.tsx` lines 125-129: Save button shown when `isEditing && inputValue.trim() !== ''`; `handleSave()` calls `setApiKey(trimmed)` then closes |
| 5 | API key dialog allows clearing the stored key with confirmation | VERIFIED | `api-key-dialog.tsx` lines 52-58, 120-124: two-click clear pattern; first click sets `showClearConfirm = true`, second calls `setApiKey(null)` |
| 6 | Clicking the CreditsBadge area in the nav bar opens the API key dialog | VERIFIED | `layout-shell.tsx` line 96: `<CreditsBadge onClick={() => setApiKeyDialogOpen(true)} />`; line 180: `<ApiKeyDialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen} />` |
| 7 | CreditsBadge shows key icon + status text in the top row | VERIFIED | `credits-badge.tsx` lines 45-61: top row has SVG key icon with conditional coloring, span with `sk-...${apiKey.slice(-4)}` or `'Add key'` |
| 8 | CreditsBadge shows credits amount in the bottom row | VERIFIED | `credits-badge.tsx` lines 63-68: bottom row renders `$${remaining.toFixed(2)}` or loading/error fallbacks |
| 9 | Key icon is cyan when a key is stored, muted when no key | VERIFIED | `credits-badge.tsx` lines 52, 57: `apiKey ? 'text-accent' : 'text-muted-foreground'` on both icon and text |
| 10 | Status text shows last 4 chars of key when stored, 'Add key' when no key | VERIFIED | `credits-badge.tsx` line 59: `apiKey ? \`sk-...\${apiKey.slice(-4)}\` : 'Add key'` |
| 11 | CreditsBadge area has hover-hatch-cyan and cursor-pointer | VERIFIED | `credits-badge.tsx` line 42: `className="hover-hatch-cyan cursor-pointer flex flex-col items-start..."` |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/use-api-key.ts` | useApiKey hook with get/set/clear | VERIFIED | 36 lines; exports `useApiKey`; `useSyncExternalStore` + `StorageEvent` pattern; `'use client'` directive present |
| `src/components/api-key-dialog.tsx` | ApiKeyDialog component with enter/edit/clear | VERIFIED | 135 lines; exports `ApiKeyDialog`; full state machine (isEditing, showClearConfirm, inputValue); `'use client'` directive present |
| `src/components/credits-badge.tsx` | Two-row CreditsBadge with key status indicator | VERIFIED | 72 lines; two-row `<button>` layout with key status row and credits row; `onClick` prop wired |
| `src/components/layout-shell.tsx` | Nav bar with ApiKeyDialog wired to CreditsBadge click | VERIFIED | `apiKeyDialogOpen` state, `setApiKeyDialogOpen` handler on CreditsBadge, `<ApiKeyDialog>` rendered at line 180 |
| `src/components/ui/input.tsx` | shadcn Input component (dependency) | VERIFIED | File exists at expected path |
| `src/app/globals.css` (stamp-btn-nav-cyan) | Cyan nav button CSS class | VERIFIED | Full class definition at lines 403-437 with hover, active, and disabled states |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `api-key-dialog.tsx` | `use-api-key.ts` | `import useApiKey` | WIRED | Line 4: `import { useApiKey } from '@/hooks/use-api-key'`; line 26: `const [apiKey, setApiKey] = useApiKey()` — both imported and called |
| `use-api-key.ts` | localStorage | `getItem/setItem/removeItem` | WIRED | Lines 9, 26, 28: all three methods used; reads on snapshot, writes and removes on setApiKey call |
| `credits-badge.tsx` | `use-api-key.ts` | `import useApiKey` | WIRED | Line 4: `import { useApiKey } from '@/hooks/use-api-key'`; line 11: `const [apiKey] = useApiKey()` — imported and used to drive conditional rendering |
| `layout-shell.tsx` | `api-key-dialog.tsx` | `import ApiKeyDialog, render with open/onOpenChange` | WIRED | Line 10: import; line 180: `<ApiKeyDialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen} />` |
| `layout-shell.tsx` | `credits-badge.tsx` | `onClick handler sets dialog open state` | WIRED | Line 96: `<CreditsBadge onClick={() => setApiKeyDialogOpen(true)} />` — `setApiKeyDialogOpen` call confirmed |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| KEY-01 | 17-02 | User can open an API key dialog from a button in the nav bar top-right | SATISFIED | `layout-shell.tsx` line 96: CreditsBadge onClick triggers `setApiKeyDialogOpen(true)`; dialog renders at line 180 |
| KEY-02 | 17-01 | User can enter, update, and clear their OpenRouter API key in the dialog | SATISFIED | `api-key-dialog.tsx`: enter flow (isEditing + Save), edit flow (Edit button + Save), clear flow (Clear + Confirm Clear) all implemented |
| KEY-03 | 17-01 | API key persists in browser localStorage across sessions | SATISFIED | `use-api-key.ts`: `localStorage.setItem` on save, `localStorage.getItem` on read, `localStorage.removeItem` on clear; SSR-safe with `typeof window === 'undefined'` guard |
| KEY-04 | 17-02 | Button indicates key status (configured vs. needed) | SATISFIED | `credits-badge.tsx`: key icon and text color are `text-accent` (cyan) when key stored, `text-muted-foreground` when absent; text shows masked key or "Add key" |

All 4 requirements from plans are accounted for. No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No TODO/FIXME comments, placeholder returns, or stub handlers found in any of the 4 phase files.

**TypeScript check note:** `npx tsc --noEmit` reports errors in `src/components/skeleton.tsx` (lines 89, 91, 99) and `src/app/layout.tsx` (streamdown import). These are pre-existing from commits `6110a03` and prior, not introduced by phase 17. No new type errors exist in the phase 17 files.

### Human Verification Required

#### 1. Visual layout of two-row CreditsBadge

**Test:** Run `npm run dev:next`, open http://localhost:3000, inspect the top-right nav bar area where CreditsBadge sits.
**Expected:** A vertically stacked two-row badge: top row shows a key icon (SVG) + "Add key" text (muted), bottom row shows credit amount. When a key is stored, top row icon and text turn cyan and show `sk-...XXXX`.
**Why human:** CSS rendering, SVG icon appearance, color transitions, and responsive layout require live browser evaluation.

#### 2. API key entry, persistence, and cross-tab sync

**Test:** Enter a test key (e.g., `sk-or-test-1234567890abcdef`) via the dialog, save, reload the page, then open a second tab and change the key.
**Expected:** Key persists across reload and appears as masked preview in dialog. Second tab updates its nav bar display when key changes in the first tab.
**Why human:** localStorage persistence across page reload and StorageEvent cross-tab synchronization require a live browser session.

#### 3. Full dialog interaction flow

**Test:** Click CreditsBadge, enter a key, save; click CreditsBadge again (now shows masked preview + Edit/Clear buttons); click Edit (input appears empty); click Cancel (no change); click Clear, then Confirm Clear (key removed, "Add key" shown).
**Expected:** Each state transition behaves as designed: read-only view when key exists, edit mode on Edit click, two-click clear confirmation, dialog state resets on reopen.
**Why human:** Interactive dialog state machine transitions and UX quality cannot be verified programmatically.

### Gaps Summary

No gaps found. All 11 observable truths are verified, all 4 requirements are satisfied, all key links are wired, and no anti-patterns are present in the phase files.

---

_Verified: 2026-03-06T09:35:00Z_
_Verifier: Claude (gsd-verifier)_
