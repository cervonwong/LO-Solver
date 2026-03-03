# Credits Display in Nav Bar

Display remaining OpenRouter credits in the top nav bar.

## Decisions

- **Placement**: Between ModelModeToggle and the Abort/New Problem divider
- **Format**: `$X.XX left` (remaining = total_credits - total_usage)
- **Data fetch**: Server-side API route (`/api/credits`) proxying to OpenRouter
- **Refresh**: On mount + poll every 20 seconds
- **Architecture**: Standalone `<CreditsBadge>` component, no shared context

## API Route

**`src/app/api/credits/route.ts`**

- GET handler, reads `OPENROUTER_API_KEY` from env
- Calls `https://openrouter.ai/api/v1/credits` with Bearer auth
- Returns `{ remaining: number }` on success
- Returns `{ remaining: null, error: string }` on failure

## Component

**`src/components/credits-badge.tsx`**

- Client component with self-contained fetch logic
- `useEffect` on mount: fetch + `setInterval(20_000)`
- States: loading (`--`), error (`ERR`), success (`$12.45 left`)
- Icon: Material Symbols "local_atm" at 14px, `fill="currentColor"`
- Value: `.dimension` class (cyan). Label "left": muted-foreground uppercase

## NavBar Integration

**`src/components/layout-shell.tsx`**

- Import and render `<CreditsBadge />` after `<ModelModeToggle>`
- NOT disabled during workflow runs (informational, not config)

## Styling

- Follows DESIGN.md: no rounded corners, cyan values, uppercase labels
- Icon sized 14px matching other nav icons
