# Pitfalls Research

**Domain:** Security hardening of an existing Next.js + Mastra AI workflow system
**Researched:** 2026-03-17
**Confidence:** HIGH (based on direct codebase analysis of all affected systems)

## Critical Pitfalls

### Pitfall 1: Removing apiKey from workflow state breaks step data access

**What goes wrong:**
The `apiKey` field in `workflowStateSchema` is the sole mechanism for passing the user's OpenRouter API key from Step 1 (extract) to Steps 2 (hypothesize) and 3 (answer). Each step creates a fresh `RequestContext` and calls `createOpenRouterProvider(state.apiKey)` to build its per-request provider. Removing `apiKey` from the state schema without replacing it with an equivalent propagation mechanism causes Steps 2 and 3 to fall back to the singleton `openrouter` provider (env key), or -- if no env key is set -- to `undefined`, crashing every agent call.

Affected code paths:
- `steps/01-extract.ts:35` -- sets `apiKey: inputData.apiKey` into state via `setState`
- `steps/02-hypothesize.ts:79-80` -- reads `state.apiKey` to create per-request provider
- `steps/03-answer.ts:57-58` -- reads `state.apiKey` to create per-request provider

**Why it happens:**
The natural security instinct is "don't persist secrets to disk" so the developer removes `apiKey` from `workflowStateSchema`. But Mastra workflow state is the *only* mechanism to transfer data between steps -- `RequestContext` is step-local and dies at step boundaries. The developer doesn't realize that removing the field severs the pipeline's key propagation chain.

**How to avoid:**
Replace `state.apiKey` with a non-persisted propagation mechanism. Options in order of preference:
1. Use Mastra's workflow-level `requestContext` if it survives across steps (investigate via Mastra docs)
2. Use an in-memory side-channel keyed by `runId` (similar to the `activeRuns` Map pattern in `active-runs.ts`) -- store the key at workflow start, read it in each step, clean up on completion
3. Keep `apiKey` in state but strip it from the state object before `setState()` calls in Steps 2 and 3 (so it's in memory during the step but not re-persisted)
4. As a last resort, keep `apiKey` in state but add a workflow-completion hook to clear the record from LibSQL

**Warning signs:**
- Workflow succeeds with env-key fallback but fails when `OPENROUTER_API_KEY` is unset
- Steps 2 and 3 silently use the server key instead of the user's key (wrong billing)
- `createOpenRouterProvider` call disappears from step initialization code
- Eval harness (which never passes `apiKey`) continues working, masking the regression

**Phase to address:**
Phase 1 (API key transport) -- this is the foundational change. Must be implemented and verified before any other security work.

---

### Pitfall 2: setState() writes secrets to LibSQL on every call

**What goes wrong:**
Mastra's `LibSQLStore` in `src/mastra/index.ts` automatically persists workflow state to `mastra.db` on every `setState()` call. Since `apiKey` is in `workflowStateSchema`, every `setState()` writes the plaintext API key to SQLite. The key appears in: (a) the LibSQL database file, (b) WAL/journal files, (c) potentially Mastra's internal logs.

The state is written frequently -- Step 1 calls `setState` twice, Step 2 calls it once per round (up to 3 rounds), and Step 3 calls it once. That's 4-7 writes of the plaintext key per solve.

Even after removing `apiKey` from the schema, old run records in LibSQL still contain the key unless the database is cleared.

**Why it happens:**
Mastra manages storage internally. The developer controls the schema but not the persistence mechanism. Every field in `workflowStateSchema` gets serialized and stored via Zod -- there's no "transient" annotation. The `setState()` pattern spreads the full state: `await setState({ ...state, stepTimings: [...] })`, so `apiKey` is included in every write even when unmodified.

**How to avoid:**
1. Remove `apiKey` from `workflowStateSchema` as part of the key transport migration (Pitfall 1)
2. After migration, use `npm run dev:new` (which clears the database) as the cleanup mechanism
3. Do NOT attempt to add encryption at the LibSQL layer -- overengineering for a dev tool
4. Do NOT write SQL migration scripts against Mastra-managed tables (see Pitfall 3)

**Warning signs:**
- `sqlite3 mastra.db "SELECT * FROM ..."` reveals API keys in plaintext
- The key appears in multiple `setState()` calls per workflow execution
- State spread pattern (`{ ...state, ... }`) carries the key forward silently

**Phase to address:**
Phase 1 (API key transport) -- the key must stop flowing through state before cleanup matters.

---

### Pitfall 3: Direct LibSQL manipulation conflicts with Mastra framework assumptions

**What goes wrong:**
Attempting to clean up old API keys by directly manipulating LibSQL tables (DELETE, UPDATE on workflow run records) may conflict with Mastra's internal assumptions about table schemas, row lifecycle, and caching. Mastra may have in-memory caches, migration versioning, or integrity checks that break when external tools modify the database.

**Why it happens:**
The developer sees plaintext keys in the DB and wants to clean them up immediately. The impulse is to run SQL directly. But Mastra owns the database schema and access patterns -- it's not a user-managed store.

**How to avoid:**
- Use `npm run dev:new` (which clears the database) as the cleanup mechanism -- it already exists
- If targeted cleanup is needed, check Mastra's API for run deletion/cleanup methods
- Accept that old run data with keys will be cleared on the next `dev:new` restart
- Do NOT write migration scripts that directly ALTER or DELETE from Mastra-managed tables
- Treat `mastra.db*` as ephemeral (already in `.gitignore`)

**Warning signs:**
- Dev server crashes after database modification with schema mismatch errors
- Mastra logs show "table not found" or "column mismatch" errors
- Workflow state reads return unexpected shapes after manual edits

**Phase to address:**
Phase 1 -- document the cleanup strategy (use `dev:new`) rather than building tooling for it.

---

### Pitfall 4: Moving key from query string to header without updating all consumers

**What goes wrong:**
The API key currently flows through query strings in one place: `/api/credits?key=${encodeURIComponent(apiKey)}` (in `credits-badge.tsx:50`). The API key also flows through the request body to `/api/solve` (in `use-solver-workflow.ts:33`). Moving the key to a header requires updating both the frontend sender and the backend receiver atomically. If only one side is updated:
- Frontend sends header, backend reads query string -> key is lost, credits show "ERR"
- Frontend sends query string, backend reads header -> same result

Additionally, the `inputData.apiKey` field that flows through the POST body to `/api/solve` is a separate transport path from the credits query string. Both must be migrated, but they use different HTTP methods (GET vs POST) and different request structures.

**Why it happens:**
The developer migrates the solve endpoint (POST body -> header) but forgets the credits endpoint (GET query string -> header). Or vice versa. The two endpoints have completely different code paths and no shared abstraction for key extraction.

**How to avoid:**
1. Create a single server-side helper: `getApiKeyFromRequest(req: Request): string | undefined` that reads from the header
2. Create a single client-side helper that adds the header to all fetch calls
3. Update all API routes that accept keys in one PR: `/api/solve`, `/api/credits`, and any future endpoints
4. Test both the solve flow and the credits polling after migration
5. Update `use-solver-workflow.ts` to send the key via header instead of in `inputData`

**Warning signs:**
- Credits badge shows "ERR" or "--" permanently after migration
- Solve works but credits display is broken (or vice versa)
- Network tab shows the key still appearing in URLs for some requests

**Phase to address:**
Phase 1 (API key transport) -- must be done as an atomic change across all endpoints.

---

### Pitfall 5: Cancel endpoint session scoping breaks the existing abort UX

**What goes wrong:**
Adding session-scoped guards to `/api/solve/cancel` (e.g., requiring a session token or matching runId) can break the abort flow if the frontend doesn't send the right credentials. The current cancel endpoint is a simple `POST` that cancels *all* active runs -- it works because there's only ever one active run in a single-user tool. Adding authentication or scoping without updating the frontend's `handleStop()` in `use-solver-workflow.ts` causes 401/403 responses, and the user sees the abort button "do nothing."

Worse: the cancel endpoint is called via a button click in `handleStop()`. This function calls `stop()` from `useChat` which closes the client stream -- it does NOT call the cancel endpoint directly. The cancel endpoint is only called via explicit fetch from the abort confirmation dialog. If the cancel endpoint now requires the same API key that was used to start the solve, and the user has changed their key since starting, cancellation fails.

**Why it happens:**
The developer applies a security pattern from multi-user systems ("only the session that started a run can cancel it") to a single-user tool where that complexity adds no security value but creates failure modes.

**How to avoid:**
- Keep the cancel endpoint simple -- it's a local dev tool, not a SaaS API
- If scoping by runId, return the runId from the solve endpoint and have the frontend send it back for cancellation -- but verify this works with the streaming `createUIMessageStreamResponse` pattern
- Test the full abort flow end-to-end after any changes: click Solve, wait for activity, click Abort, confirm the workflow stops and UI enters the "aborted" amber state
- Consider: the `activeRuns` Map already provides natural scoping (only current process runs are cancellable)

**Warning signs:**
- Abort button click produces no visible effect
- Network tab shows 401/403 on cancel endpoint
- `activeRuns` Map has entries that never get cleaned up
- Console shows "cancel() after completion is a no-op" when cancel should have worked

**Phase to address:**
Phase 2 (endpoint guards) -- after key transport (Phase 1) is stable. Test the complete abort flow after changes.

---

### Pitfall 6: Logging changes that break the eval harness or corrupt data flow

**What goes wrong:**
The eval harness (`src/evals/run.ts`) runs the workflow via `workflow.createRun()` + `run.start()`. It reads step outputs from the result: `result.steps['extract-structure']?.output`. The eval doesn't consume logs directly, but logging and data flow share the same variables. In every step file, the same `response.object` is both logged AND parsed:

```typescript
// 01-extract.ts:125-131
logAgentOutput(logFile, 'Step 1', 'Extractor', response.object, ...);  // logged
const parseResult = structuredProblemSchema.safeParse(response.object);  // parsed
```

If a "security improvement" mutates the response object before logging (to redact fields), the mutation affects the parser too. JavaScript objects are passed by reference -- `redact(response.object)` that modifies in-place will corrupt the data that `safeParse` receives.

Additionally:
- If logging becomes mandatory (throws on missing `LOG_DIRECTORY`), evals fail in clean environments
- If the `logAgentOutput` function signature changes, all 7 call sites across step files must be updated consistently
- If log file path generation (`getLogFilePath`) is made conditional, `initializeWorkflowState()` may return an empty `logFile` that causes downstream null-path errors

**Why it happens:**
Logging and data parsing share the same variables. The developer doesn't realize that modifying the logged object also modifies the parsed object.

**How to avoid:**
- Never mutate agent response objects before they are parsed by `safeParse()`
- If redacting log output, create a shallow copy: `logAgentOutput(logFile, step, agent, { ...response.object, sensitiveField: '[REDACTED]' }, ...)`
- Keep logging graceful (already is -- `if (!logFile) return;` in all log functions)
- Run the eval harness after any logging changes: `npm run eval -- --problem linguini-001`
- Do not make `LOG_DIRECTORY` mandatory

**Warning signs:**
- Eval scores drop to 0 after logging changes (parsing failures)
- `safeParse` fails with "Expected object, received string" after redaction
- `logAgentOutput` receives `undefined` or `[REDACTED]` instead of actual data
- Evals work fine but log files show `[REDACTED]` where data should be

**Phase to address:**
Phase 3 (logging hardening) -- must come after key transport changes are stable. Run evals before and after.

---

### Pitfall 7: Over-engineering authentication for a single-user dev tool

**What goes wrong:**
The developer adds session management, CSRF tokens, JWT auth, or middleware-based authentication to a tool that runs on `localhost:3000`. This adds complexity without security benefit:
- Session tokens need storage, expiry, refresh logic
- CSRF protection is irrelevant for API routes called only by the same-origin SPA
- JWT adds a dependency and key management overhead
- Auth middleware can block the Mastra dev server (port 4111, Mastra Studio) or the eval harness (which calls workflow endpoints directly without browser context)

The eval harness is particularly vulnerable: `run.ts` calls `workflow.createRun()` + `run.start()` directly through the Mastra API (not HTTP endpoints), so HTTP-level auth doesn't affect it -- but if auth guards are added to the workflow itself (e.g., checking for an API key before starting), evals break because they use the env key, not a user-provided key.

**Why it happens:**
Security checklists designed for production SaaS get applied wholesale to a dev tool. The developer doesn't distinguish between "protect against network attackers" and "prevent accidental key exposure."

**How to avoid:**
- Match security investment to threat model: the threat is "API keys persisted to disk" and "keys in URLs," not "unauthorized users accessing the app"
- Focus on actual risks: key in state, key in query strings, key in logs
- Skip: session management, CSRF protection, rate limiting, auth middleware
- If adding endpoint guards, use the simplest check: "does the request include the expected header?"
- Never add guards that require the eval harness to pass credentials

**Warning signs:**
- New middleware files appear (e.g., `middleware.ts`, `auth.ts`)
- `npm run dev` requires additional setup steps
- Eval harness needs auth tokens to run
- Mastra Studio stops working due to auth middleware

**Phase to address:**
All phases -- this is a meta-pitfall. Apply "is this proportionate to the threat?" test before every change.

---

### Pitfall 8: Rate limiting that hurts development UX

**What goes wrong:**
Adding rate limiting to `/api/solve` or `/api/credits` throttles the developer's own usage. The `/api/credits` endpoint polls every 20 seconds (`credits-badge.tsx:71`). Rate limiting this causes the credits badge to show "ERR" constantly. For `/api/solve`, the workflow internally makes 15-30+ LLM calls -- but the route is only called once per solve. If rate limiting is applied at the API route level, it affects legitimate usage without preventing abuse (since there's no abuse scenario for localhost).

**Why it happens:**
Rate limiting is on every security hardening checklist. The developer adds it without considering that all requests come from one user on localhost.

**How to avoid:**
- Do not add rate limiting for v1.7 -- it's explicitly out of scope per PROJECT.md ("single-user dev tool")
- If rate limiting is added later (for deployment), apply it per-API-key (not per-IP) and exclude polling endpoints
- Use upstream provider rate limits (OpenRouter already has them) instead of application-level limits

**Warning signs:**
- Credits badge flickers between value and "ERR"
- Solve attempts fail with 429
- Dev workflow requires waiting between solve attempts

**Phase to address:**
Explicitly defer to post-v1.7. Document that rate limiting is intentionally omitted.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keeping `apiKey` in workflow state "for now" | Zero refactoring effort | Key persisted to LibSQL on every setState call; grows as more users try the tool | Never -- this is the core problem v1.7 solves |
| API key in query string (`/api/credits?key=...`) | Simple to implement, already works | Key appears in server logs, browser history, proxy logs, Mastra observability | Never -- move to header immediately |
| Redacting entire log sections instead of specific fields | Quick fix for "don't log secrets" | Loses debugging value; makes production issues uninvestigable | Never -- redact the specific sensitive field, keep the rest |
| Adding auth middleware to all routes | "Defense in depth" feeling | Breaks eval harness, Mastra Studio, and development flow | Never for this project -- disproportionate to threat model |
| Using `JSON.stringify(state)` for debugging | Quick visibility into state during dev | Dumps API key into console/log files | Only with a redaction helper: `JSON.stringify(redactState(state))` |
| Stripping apiKey from state by omitting in setState spread | Prevents persistence without schema change | Fragile -- any new setState call that includes `...state` re-introduces the key | Acceptable as temporary fix; must be replaced with proper propagation mechanism |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Mastra `setState()` | Assuming state is ephemeral; it's persisted to LibSQL | Treat every field in `workflowStateSchema` as "will be written to disk"; never put secrets there |
| Mastra `RequestContext` | Assuming RequestContext survives across steps | Each step creates a new `RequestContext`; cross-step data must go through workflow state or an in-memory side-channel |
| `createOpenRouterProvider()` | Creating the provider once and sharing across steps | Must create per-step because RequestContext is step-scoped; the provider holds the API key in its closure |
| `activeRuns` Map | Assuming entries auto-expire or are always cleaned | Entries clean up in the `finally` block of the stream handler only; crashed or orphaned runs persist until server restart |
| `createUIMessageStreamResponse` | Trying to set response headers after streaming starts | Headers must be set before `createUIMessageStreamResponse` returns; cannot inject auth tokens mid-stream |
| Next.js middleware | Applying middleware to all routes including API routes | Middleware runs before API route handlers; can block non-browser callers (eval harness, Mastra Studio) |
| `chatId` in `use-solver-workflow.ts` | Changing key transport without updating chatId derivation | `chatId` uses `apiKey.slice(-4)` for uniqueness; if key no longer flows through frontend state, chatId stops changing on key update, causing stale transport reuse |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Module-level `activeRuns` Map without TTL | Crashed workflows leave entries forever; Map grows over many solves | Add a TTL sweep or size check; current `finally` block handles normal cases | After ~50 abandoned solves without server restart |
| Synchronous `fs.appendFileSync` in logging | Blocks event loop during I/O | Switch to async `fs.promises.appendFile` if concurrent solves are added | Only with concurrent solves + large log files; fine for single-user now |
| Header-based key extraction on every request | Minimal overhead per request | No real performance concern -- header parsing is O(1) | Never a problem at this scale |

## Security Mistakes

Domain-specific security issues for this particular system.

| Mistake | Risk | Prevention |
|---------|------|------------|
| API key in query string (`/api/credits?key=...`) | Key logged by web servers, proxies, browser history, Mastra observability spans | Move to `Authorization` or `X-Api-Key` header |
| API key persisted to LibSQL via workflow state | Key on disk in plaintext; survives across sessions; in WAL files even after delete | Remove from `workflowStateSchema`; propagate through non-persisted channel |
| Mutating response objects during log redaction | Corrupts data flow; `safeParse()` receives redacted data instead of original | Always copy before redacting: `logFn({ ...response.object, key: '[REDACTED]' })` |
| Console.log of full state objects in step files | API key appears in server console output (e.g., `console.log(state)`) | Never log full state; log specific fields or use a state-redaction helper |
| API key visible in frontend `chatId` | Last 4 chars of key in React state/devtools; minimal real risk but unnecessary exposure | Use a hash or counter for chatId uniqueness instead of key suffix |
| LLM responses logged with full JSON | Problem text could contain sensitive linguistic data (minimal risk for this app) | Acceptable for dev tool; document that `logs/` contains problem data |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Adding auth requirements that weren't there before | "It worked yesterday, now it's broken" -- user must figure out new setup | Make all guards transparent; no new setup steps |
| Moving key from query string to header without updating `credits-badge.tsx` | Credits badge shows "ERR" permanently because endpoint no longer receives the key | Update frontend and backend atomically; test credits polling after changes |
| Making log directory mandatory | Dev setup requires creating a directory that was previously auto-created | Keep auto-creation behavior (`mkdirSync({ recursive: true })` in `initializeLogFile`) |
| Breaking the "no env key needed" deployment mode | Users who deploy with user-provided keys get "missing env key" errors on startup | The app already handles missing `OPENROUTER_API_KEY` gracefully; don't add checks that assume it exists |
| Rate limiting the credits polling endpoint | Credits badge alternates between value and "ERR" every 20 seconds | Exclude polling endpoints from any rate limiting |

## "Looks Done But Isn't" Checklist

- [ ] **API key removed from state schema:** Check that `createOpenRouterProvider(state.apiKey)` in `02-hypothesize.ts:80` and `03-answer.ts:58` have been updated to use the new propagation mechanism. Missing this means the key silently falls back to env key.
- [ ] **Key moved to headers:** Check that `credits-badge.tsx:50` no longer sends key via query string: `/api/credits?key=${encodeURIComponent(apiKey)}`. Both the frontend fetch and `credits/route.ts` must be updated.
- [ ] **Cancel endpoint still works:** The frontend abort flow (`handleStop` -> `stop()` + cancel fetch) doesn't send credentials. If cancel now requires auth, the abort button silently fails. Test: Start solve -> Click abort -> Verify amber "aborted" state appears.
- [ ] **Eval harness still works:** Eval runs the workflow without a user API key (uses env key). If new guards reject requests without user-provided keys, eval breaks. Test: `npm run eval -- --problem linguini-001` produces non-zero scores.
- [ ] **Log redaction preserves data flow:** Agent response objects are used for both logging and parsing. Verify `response.object` is never mutated before `safeParse()` in any step file (check all 7 `logAgentOutput` call sites).
- [ ] **Frontend chatId still triggers transport refresh:** The `chatId` in `use-solver-workflow.ts:45` uses `apiKey.slice(-4)`. If key transport changes remove the API key from frontend state (e.g., httpOnly cookies), chatId stops changing on key update, causing stale transport reuse.
- [ ] **No new env vars required:** If security changes introduce required environment variables, the "zero-config" deployment mode breaks. `OPENROUTER_API_KEY` must remain optional.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| apiKey removed from state, Steps 2/3 crash | LOW | Add the key back to state temporarily; implement proper propagation. Regression is immediately visible (workflow errors). |
| Old API keys in LibSQL | LOW | Run `npm run dev:new` to clear the database. No user data at risk. |
| Credits endpoint broken by partial migration | LOW | Revert the endpoint. The credits route is 30 lines. Fix both frontend and backend together. |
| Cancel endpoint regression | LOW | Revert the endpoint guard. The cancel route is 16 lines. |
| Logging changes break evals | MEDIUM | Compare eval scores before/after. Regression may be subtle (lower scores, not crashes). Test with `npm run eval -- --problem linguini-001`. |
| Over-engineered auth blocks dev workflow | LOW | Delete the middleware file. Auth is additive -- removing it restores original behavior. |
| Rate limiting breaks credits polling | LOW | Remove rate limiting from `/api/credits`. One-line route change. |
| Mutated response object corrupts parsing | MEDIUM | Find the mutation site; add shallow copy before redaction. May require re-running affected evals to verify scores are restored. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| apiKey in workflow state (1) | Phase 1: Key transport | Steps 2/3 work with user key when `OPENROUTER_API_KEY` is unset |
| setState writes secrets (2) | Phase 1: Key transport | `sqlite3 mastra.db` shows no API keys in current run records |
| Direct LibSQL manipulation (3) | Phase 1: Key transport | No SQL migration scripts in the PR; use `dev:new` for cleanup |
| Partial key migration (4) | Phase 1: Key transport | Credits badge shows correct value; network tab shows no keys in URLs |
| Cancel endpoint regression (5) | Phase 2: Endpoint guards | Full abort flow: Start solve -> Wait for activity -> Abort -> Amber state appears |
| Logging corrupts data flow (6) | Phase 3: Logging hardening | `npm run eval -- --problem linguini-001` produces non-zero scores matching pre-change baseline |
| Over-engineering auth (7) | All phases | No new middleware files; eval harness runs without extra config; no new required env vars |
| Rate limiting (8) | Defer/never | Not implemented in v1.7; documented as intentional omission |

## Sources

- Direct codebase analysis of `src/mastra/workflow/steps/` (all step files: 01-extract, 02-hypothesize, 02a-dispatch, 02b-hypothesize, 02c-verify, 02d-synthesize, 03-answer)
- `src/mastra/workflow/workflow-schemas.ts` -- `apiKey` field in both `workflowStateSchema` and `rawProblemInputSchema`
- `src/mastra/workflow/request-context-types.ts` -- WorkflowRequestContext interface showing step-local scope
- `src/mastra/workflow/request-context-helpers.ts` -- `getOpenRouterProvider()` fallback chain, cost tracking
- `src/app/api/solve/route.ts` -- key extraction from `params.inputData.apiKey`
- `src/app/api/solve/cancel/route.ts` -- unguarded cancel endpoint (16 lines)
- `src/app/api/solve/active-runs.ts` -- module-level singleton Map for run tracking
- `src/app/api/credits/route.ts` -- key via query string `url.searchParams.get('key')`
- `src/hooks/use-solver-workflow.ts` -- key in POST body via `inputData`, chatId using key suffix
- `src/hooks/use-api-key.ts` -- localStorage persistence of key
- `src/components/credits-badge.tsx` -- key in query string for credits polling
- `src/mastra/workflow/logging-utils.ts` -- all logging functions, synchronous file I/O
- `src/mastra/index.ts` -- LibSQLStore configuration
- `src/evals/run.ts` -- eval harness workflow invocation (no HTTP, no user key)
- `.planning/PROJECT.md` -- v1.7 milestone scope, constraints, out-of-scope items

---
*Pitfalls research for: Security hardening of LO-Solver (v1.7 milestone)*
*Researched: 2026-03-17*
