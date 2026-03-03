---
phase: quick-19
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/credits/route.ts
  - src/components/credits-badge.tsx
  - src/components/layout-shell.tsx
autonomous: true
requirements: [QUICK-19]
must_haves:
  truths:
    - "Nav bar shows remaining OpenRouter credits as a dollar amount"
    - "Credits value refreshes automatically every 20 seconds"
    - "Loading state shows '--' and error state shows 'ERR'"
    - "Credits display is NOT disabled during workflow execution"
  artifacts:
    - path: "src/app/api/credits/route.ts"
      provides: "Server-side proxy to OpenRouter credits API"
      exports: ["GET"]
    - path: "src/components/credits-badge.tsx"
      provides: "Self-contained credits display component"
      exports: ["CreditsBadge"]
    - path: "src/components/layout-shell.tsx"
      provides: "NavBar with CreditsBadge integrated"
  key_links:
    - from: "src/components/credits-badge.tsx"
      to: "/api/credits"
      via: "fetch in useEffect + setInterval"
      pattern: "fetch.*api/credits"
    - from: "src/components/layout-shell.tsx"
      to: "src/components/credits-badge.tsx"
      via: "JSX import and render"
      pattern: "CreditsBadge"
---

<objective>
Add a live OpenRouter credits display to the nav bar showing remaining balance as "$X.XX left".

Purpose: Give the user at-a-glance visibility into their OpenRouter spending without leaving the app.
Output: API route, CreditsBadge component, and NavBar integration.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@docs/plans/2026-03-03-credits-display-design.md
@src/components/layout-shell.tsx
@src/components/model-mode-toggle.tsx
@DESIGN.md
</context>

<interfaces>
<!-- From src/components/layout-shell.tsx — NavBar structure -->
<!-- CreditsBadge goes AFTER ModelModeToggle, BEFORE the divider separating config from abort/new-problem -->
<!-- The config section is wrapped in a div with conditional opacity/pointer-events for isRunning -->
<!-- CreditsBadge must be placed OUTSIDE that disabled wrapper since it is informational -->

From src/components/model-mode-toggle.tsx:
```typescript
export function ModelModeToggle({ disabled }: { disabled?: boolean })
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Create API route and CreditsBadge component</name>
  <files>src/app/api/credits/route.ts, src/components/credits-badge.tsx</files>
  <action>
Create `src/app/api/credits/route.ts`:
- Export async GET handler
- Read `OPENROUTER_API_KEY` from `process.env`
- If key missing, return `NextResponse.json({ remaining: null, error: 'API key not configured' })`
- Fetch `https://openrouter.ai/api/v1/credits` with `Authorization: Bearer ${key}` header
- On success: parse response JSON, compute `remaining = data.total_credits - data.total_usage`, return `NextResponse.json({ remaining })`
- On failure (non-ok response or catch): return `NextResponse.json({ remaining: null, error: 'Failed to fetch credits' })`
- Import `NextResponse` from `next/server`

Create `src/components/credits-badge.tsx`:
- `'use client'` directive
- Import `useState`, `useEffect` from React
- Export function `CreditsBadge` (no props)
- State: `remaining: number | null` (init null), `error: boolean` (init false), `loading: boolean` (init true)
- `useEffect` on mount:
  - Define async `fetchCredits` function: fetch `/api/credits`, parse JSON, if `data.remaining !== null` set remaining and clear error, else set error true. Set loading false. Wrap in try/catch setting error true on failure.
  - Call `fetchCredits()` immediately
  - `const interval = setInterval(fetchCredits, 20_000)`
  - Return cleanup: `clearInterval(interval)`
- Render a `<div>` with `className="flex items-center gap-1.5 text-xs"`:
  - SVG icon: `<svg xmlns="http://www.w3.org/2000/svg" height="14" viewBox="0 -960 960 960" width="14" fill="currentColor" className="inline-block">` with path `M460-300h40v-40h49.23q13.08 0 21.92-8.85 8.85-8.84 8.85-21.92v-98.46q0-13.08-8.85-21.92-8.84-8.85-21.92-8.85H420v-80h160v-40h-80v-40h-40v40h-49.23q-13.08 0-21.92 8.85-8.85 8.84-8.85 21.92v98.46q0 13.08 8.85 21.92 8.84 8.85 21.92 8.85H540v80H380v40h80v40ZM120-200v-560h720v560H120Zm40-40h640v-480H160v480Zm0 0v-480 480Z`
  - Value display: `<span className="dimension">` containing:
    - If loading: `--`
    - If error: `ERR`
    - Else: `$${remaining!.toFixed(2)}`
  - Label: `<span className="text-muted-foreground uppercase tracking-wider">left</span>`
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -v "globals.css" | grep -c "error" | grep -q "^0$" && echo "PASS" || echo "FAIL"</automated>
  </verify>
  <done>API route returns { remaining } from OpenRouter. CreditsBadge component renders icon + "$X.XX left" with loading/error states. TypeScript compiles clean.</done>
</task>

<task type="auto">
  <name>Task 2: Integrate CreditsBadge into NavBar</name>
  <files>src/components/layout-shell.tsx</files>
  <action>
In `src/components/layout-shell.tsx`:
- Add import: `import { CreditsBadge } from '@/components/credits-badge';`
- Place `<CreditsBadge />` in the NavBar AFTER the `<ModelModeToggle>` closing tag and BEFORE the next `<div className="h-5 w-px bg-border" />` divider (the one that separates config controls from abort/new-problem buttons).
- IMPORTANT: The CreditsBadge must be OUTSIDE the wrapper div that has the `isRunning ? ' opacity-50 pointer-events-none' : ''` conditional. This means restructuring slightly:
  - Keep the existing disabled-wrapper div containing Eval Results link, divider, WorkflowSliders, divider, and ModelModeToggle
  - After that disabled-wrapper div's closing tag, render `<CreditsBadge />`
  - Then the existing `<div className="h-5 w-px bg-border" />` divider
  - Then the abort/new-problem button group (already outside the disabled wrapper)

This way CreditsBadge remains always-visible and interactive regardless of workflow state, matching the design spec.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -v "globals.css" | grep -c "error" | grep -q "^0$" && echo "PASS" || echo "FAIL"</automated>
  </verify>
  <done>CreditsBadge appears in the nav bar between ModelModeToggle and the abort/new-problem divider. It remains visible and un-dimmed during workflow execution.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes (ignoring pre-existing globals.css error)
2. `npm run dev:next` starts without errors
3. Nav bar shows credits badge with icon, dollar amount, and "left" label
4. Badge updates every 20 seconds (verify via network tab)
5. Badge is NOT dimmed when workflow is running
</verification>

<success_criteria>
- API route at /api/credits proxies OpenRouter credits and returns { remaining: number }
- CreditsBadge renders "$X.XX left" with local_atm icon in the nav bar
- Polls every 20 seconds automatically
- Shows "--" while loading, "ERR" on failure
- Not disabled during workflow execution
- TypeScript compiles clean
</success_criteria>

<output>
After completion, create `.planning/quick/19-add-openrouter-credits-display-to-nav-ba/19-SUMMARY.md`
</output>
