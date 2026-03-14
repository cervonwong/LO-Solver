# Phase 36: Evaluation Support - Research

**Researched:** 2026-03-14
**Domain:** CLI eval harness extension, result schema evolution, frontend filtering
**Confidence:** HIGH

## Summary

Phase 36 extends the existing evaluation system (`src/evals/run.ts`) to support Claude Code provider modes alongside the existing OpenRouter modes. The eval harness already accepts a `providerMode` field internally and the workflow already supports all four provider modes (`openrouter-testing`, `openrouter-production`, `claude-code-testing`, `claude-code-production`). The work is primarily plumbing: adding a `--provider` CLI flag, adding a pre-run Claude Code auth gate (mirroring the API route pattern), recording the provider in result JSON (already done via `providerMode`), and enabling the frontend eval viewer to filter/compare runs by provider.

The zero-shot solver (`src/evals/zero-shot-solver.ts`) currently only supports OpenRouter models and will need a Claude Code path for comparison mode runs with `--provider claude-code-*`.

**Primary recommendation:** Add `--provider claude-code` CLI flag that maps to `claude-code-testing`/`claude-code-production` provider modes, add a Claude Code auth pre-check before workflow execution, extend the zero-shot solver to support Claude Code models, and add provider filter controls to the frontend eval results viewer.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EVAL-01 | Eval harness accepts `--provider claude-code` flag for Claude Code provider runs | CLI arg parsing in `run.ts` already handles `--mode` for OpenRouter; extend with `--provider` flag that sets `providerMode` to a `claude-code-*` value. Auth gate pattern exists in `src/app/api/solve/route.ts`. |
| EVAL-02 | Eval results record which provider was used for cross-provider comparison | `EvalRunResult.providerMode` already stores the provider mode in result JSON. Frontend needs filter/group-by-provider controls in `src/app/evals/page.tsx`. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ai-sdk-provider-claude-code | ^3.4.4 | Claude Code AI SDK provider | Already installed; singleton in `claude-code-provider.ts` |
| ai (Vercel AI SDK) | ^6.0.101 | `generateText` for auth probe | Already used in solve route for auth gate |
| zod | ^4.3.6 | Schema validation | Already used for all schemas |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | (dev via npx) | Run TypeScript eval CLI | Already used: `npx tsx --env-file=.env src/evals/run.ts` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `--provider` flag | Extend `--mode` values | Separate flag is cleaner: `--mode` controls testing/production tier, `--provider` controls OpenRouter vs Claude Code |

## Architecture Patterns

### Current Eval Architecture
```
src/evals/
  run.ts                    # CLI entry point, arg parsing, main loop
  storage.ts                # EvalRunResult type, save/load JSON files
  problems.ts               # Ground-truth problem definitions
  translation-scorer.ts     # Accuracy scoring
  intermediate-scorers.ts   # Extraction & rule quality scoring
  zero-shot-solver.ts       # Single-call zero-shot agent (OpenRouter only)
```

### Pattern 1: CLI Flag to ProviderMode Mapping
**What:** The `--provider` flag accepts `openrouter` (default) or `claude-code`, combined with `--mode` (`testing`/`production`) to produce the full `ProviderMode` value.
**When to use:** CLI arg parsing in `parseArgs()`.
**Example:**
```typescript
// Combine --provider and --mode into ProviderMode
// --provider openrouter --mode testing  -> 'openrouter-testing'
// --provider openrouter --mode production -> 'openrouter-production'
// --provider claude-code --mode testing -> 'claude-code-testing'
// --provider claude-code --mode production -> 'claude-code-production'
// --provider claude-code (no --mode)   -> 'claude-code-testing' (default)

let provider: 'openrouter' | 'claude-code' = 'openrouter';

// In arg loop:
if (arg === '--provider') {
  const val = args[i + 1];
  if (val !== 'openrouter' && val !== 'claude-code') {
    console.error('Error: --provider must be "openrouter" or "claude-code"');
    process.exit(1);
  }
  provider = val;
  i++;
}

// After parsing:
const providerMode: ProviderMode =
  provider === 'claude-code'
    ? mode === 'production' ? 'claude-code-production' : 'claude-code-testing'
    : mode === 'production' ? 'openrouter-production' : 'openrouter-testing';
```

### Pattern 2: Auth Gate Before Eval Run (mirrors solve route)
**What:** Before starting the eval loop, verify Claude Code authentication using a lightweight `generateText` probe.
**When to use:** When `providerMode` is a Claude Code mode.
**Example:**
```typescript
// Source: src/app/api/solve/route.ts (existing pattern)
import { generateText } from 'ai';
import { claudeCode } from '@/mastra/claude-code-provider';
import { isClaudeCodeMode } from '@/mastra/openrouter';

if (isClaudeCodeMode(providerMode)) {
  console.log('Checking Claude Code authentication...');
  try {
    await generateText({
      model: claudeCode('sonnet'),
      prompt: 'Respond with OK',
      maxOutputTokens: 10,
    });
    console.log('Claude Code authenticated.\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Claude Code auth failed: ${message}`);
    console.error('Run `claude login` in your terminal, then try again.');
    process.exit(1);
  }
}
```

### Pattern 3: Zero-Shot Solver Claude Code Extension
**What:** The `solveZeroShot` function currently hardcodes OpenRouter models. For Claude Code modes, it should use the `claudeCode` provider with appropriate model shortcuts.
**When to use:** When `--comparison` is combined with `--provider claude-code`.
**Example:**
```typescript
// In zero-shot-solver.ts, the model resolver needs Claude Code branch:
model: ({ requestContext }) => {
  const pm = requestContext?.get('provider-mode') as ProviderMode | undefined;
  if (pm && isClaudeCodeMode(pm)) {
    return claudeCode(pm === 'claude-code-production' ? 'sonnet' : 'haiku');
  }
  return openrouter(pm === 'openrouter-production' ? 'google/gemini-3-flash-preview' : TESTING_MODEL);
},
```

### Pattern 4: Frontend Provider Filter
**What:** The eval results viewer already displays `providerMode` as a badge per run. Add a filter dropdown to show runs by provider.
**When to use:** In `src/app/evals/page.tsx` run history table.
**Example:**
```typescript
// Filter state
const [providerFilter, setProviderFilter] = useState<string>('all');

// Filtered runs
const filteredRuns = providerFilter === 'all'
  ? runs
  : runs.filter(r => r.providerMode === providerFilter);

// Unique provider modes from data
const providerModes = [...new Set(runs.map(r => r.providerMode))];
```

### Anti-Patterns to Avoid
- **Breaking --mode backward compatibility:** The current `--mode testing/production` flag must continue to work exactly as before. The new `--provider` flag defaults to `openrouter`, so existing usage (`npm run eval -- --mode testing`) produces identical behavior.
- **Skipping auth gate:** Claude Code without auth will produce cryptic subprocess errors deep in the workflow. Fail fast with a clear message.
- **Modifying EvalRunResult schema:** The `providerMode` field already captures the provider. Don't add a separate `provider` field -- that would duplicate information.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Claude Code auth check | Custom CLI detection | `generateText` probe pattern from solve route | Handles all error shapes (ENOENT, auth_failed, etc.) |
| Provider mode resolution | New provider mode type | Existing `ProviderMode` type and `isClaudeCodeMode()` helper | Already handles all 4 modes |
| Result migration | New migration path | Existing `migrateEvalRun()` in storage.ts | Already migrates old `modelMode` to `providerMode` |

**Key insight:** The entire provider infrastructure (ProviderMode type, isClaudeCodeMode helper, agent factory, MCP bridge) is already built in Phases 33-35. This phase is pure integration -- connecting the eval CLI to that infrastructure.

## Common Pitfalls

### Pitfall 1: Claude Code Concurrency Limits
**What goes wrong:** Running `--concurrency N > 1` with Claude Code spawns N concurrent Claude Code subprocesses, which may hit rate limits or system resource constraints.
**Why it happens:** Each workflow execution spawns multiple Claude Code processes (one per agent call). With concurrency > 1, this multiplies.
**How to avoid:** Default concurrency to 1 for Claude Code modes. Warn if user sets concurrency > 1 with Claude Code.
**Warning signs:** Subprocess spawn errors, auth token conflicts, resource exhaustion.

### Pitfall 2: Zero-Shot Solver Model Selection
**What goes wrong:** Using `claudeCode('opus')` for zero-shot comparison will be very slow and expensive (subscription cost), defeating the purpose of a quick comparison.
**Why it happens:** The zero-shot solver is meant to be a lightweight baseline. Using a heavy model undermines the comparison.
**How to avoid:** Use `haiku` for CC testing zero-shot, `sonnet` for CC production zero-shot (matching the cost tier, not the full pipeline models).
**Warning signs:** Zero-shot calls taking 60+ seconds each.

### Pitfall 3: Missing OpenRouter Key with Claude Code
**What goes wrong:** Running `--provider claude-code` but the environment also has no `OPENROUTER_API_KEY` set. The workflow works fine, but if `--comparison` is also used, the zero-shot solver may try OpenRouter models.
**How to avoid:** When `--comparison` is used with Claude Code provider, the zero-shot solver must also use Claude Code models. Don't mix providers within a single comparison run.
**Warning signs:** Zero-shot errors about missing API key.

### Pitfall 4: Result File Schema Compatibility
**What goes wrong:** Old eval results have `modelMode: 'testing' | 'production'`, new ones have `providerMode: 'claude-code-testing' | ...`. The migration in `storage.ts` only maps old `modelMode` values to `openrouter-*`.
**Why it happens:** Already handled correctly by the existing `migrateEvalRun()` function.
**How to avoid:** No action needed -- the migration already works. Just verify it handles the new values correctly (it will, since new results write `providerMode` directly).
**Warning signs:** Frontend showing wrong provider mode for old results.

## Code Examples

### Extending parseArgs() for --provider flag
```typescript
// Source: Derived from existing src/evals/run.ts parseArgs()
interface CliArgs {
  providerMode: ProviderMode;
  concurrency: number;
  problem: string | undefined;
  comparison: boolean;
  maxRounds: number;
  perspectiveCount: number;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let provider: 'openrouter' | 'claude-code' = 'openrouter';
  let mode: 'testing' | 'production' = 'testing';
  // ... existing parsing ...

  // New --provider flag
  if (arg === '--provider') {
    const val = args[i + 1];
    if (val !== 'openrouter' && val !== 'claude-code') {
      console.error('Error: --provider must be "openrouter" or "claude-code"');
      process.exit(1);
    }
    provider = val;
    i++;
  }

  // Combine into ProviderMode
  const providerMode: ProviderMode = `${provider}-${mode}` as ProviderMode;

  return { providerMode, concurrency, problem, comparison, maxRounds, perspectiveCount };
}
```

### Auth gate in main()
```typescript
// Source: Pattern from src/app/api/solve/route.ts
async function main(): Promise<void> {
  const { providerMode, ... } = parseArgs();

  // Claude Code auth gate (must be before any workflow execution)
  if (isClaudeCodeMode(providerMode)) {
    console.log('Verifying Claude Code authentication...');
    try {
      await generateText({
        model: claudeCode('sonnet'),
        prompt: 'Respond with OK',
        maxOutputTokens: 10,
      });
      console.log('Claude Code authenticated.\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Claude Code authentication failed: ${message}`);
      console.error('Run `claude login` in your terminal, then try again.');
      process.exit(1);
    }
  }

  // ... rest of main() ...
}
```

### Frontend provider filter
```typescript
// Source: Derived from existing src/app/evals/page.tsx
// In the run history table header area:
<div className="mb-3 flex items-center gap-3">
  <h2 className="font-heading text-base text-foreground">Run History</h2>
  <select
    value={providerFilter}
    onChange={(e) => setProviderFilter(e.target.value)}
    className="border border-border-subtle bg-transparent px-2 py-1 text-xs text-foreground"
  >
    <option value="all">All providers</option>
    {providerModes.map(pm => (
      <option key={pm} value={pm}>{pm}</option>
    ))}
  </select>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `--mode testing/production` (OpenRouter only) | `--provider` + `--mode` (4-way provider/tier) | Phase 36 | Eval can benchmark Claude Code vs OpenRouter |
| `modelMode` field in results JSON | `providerMode` field (already migrated in Phase 33) | Phase 33 | No schema change needed |
| Zero-shot = OpenRouter only | Zero-shot supports Claude Code models | Phase 36 | Fair comparison within same provider |

**Deprecated/outdated:**
- `modelMode` field: Already migrated by `migrateEvalRun()` in storage.ts. Old files read correctly.
- `--mode testing/production` as standalone: Still works, defaults `--provider` to `openrouter`.

## Open Questions

1. **Concurrency with Claude Code**
   - What we know: Claude Code spawns subprocesses. Each workflow execution may spawn 10+ subprocesses over its lifetime. The system handles these sequentially within a run.
   - What's unclear: Whether running 2+ concurrent workflow runs via `--concurrency` will cause Claude Code subprocess conflicts.
   - Recommendation: Default to concurrency 1 for Claude Code. Document the limitation. If users want concurrency > 1, let them try but print a warning.

2. **Zero-shot model mapping for Claude Code**
   - What we know: Zero-shot uses a single LLM call. For OpenRouter it uses `gpt-oss-120b` (testing) or `gemini-3-flash-preview` (production).
   - What's unclear: Best equivalent Claude Code models for a fair zero-shot comparison.
   - Recommendation: Use `haiku` for CC testing, `sonnet` for CC production. These roughly match the cost/capability tier of the OpenRouter models.

## Sources

### Primary (HIGH confidence)
- `src/evals/run.ts` - Current eval CLI, arg parsing, workflow invocation
- `src/evals/storage.ts` - EvalRunResult type, providerMode field, migration
- `src/evals/zero-shot-solver.ts` - Current zero-shot solver (OpenRouter only)
- `src/mastra/openrouter.ts` - ProviderMode type definition (4 values)
- `src/mastra/claude-code-provider.ts` - Claude Code singleton provider
- `src/app/api/solve/route.ts` - Auth gate pattern for Claude Code
- `src/mastra/workflow/agent-factory.ts` - Dynamic model resolution per provider mode
- `src/app/evals/page.tsx` - Frontend eval results viewer

### Secondary (MEDIUM confidence)
- `src/mastra/workflow/steps/02-shared.ts` - MCP provider attachment pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and used in the project
- Architecture: HIGH - Extending existing patterns (CLI flag, auth gate, model resolution)
- Pitfalls: HIGH - Based on direct analysis of codebase and existing Phase 33-35 decisions

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable -- internal project architecture)
