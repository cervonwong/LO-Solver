---
phase: quick-3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
autonomous: true
requirements: [FIX-ZOD-COMPAT]

must_haves:
  truths:
    - "npm ls zod shows no 'invalid' resolution warnings"
    - "npx tsc --noEmit passes (only pre-existing globals.css error)"
    - "npm run build succeeds"
    - "Structured output schema validation works for tester tool calls"
  artifacts:
    - path: "package.json"
      provides: "zod dependency pinned to v3 range"
      contains: '"zod": "^3.23.8"'
  key_links:
    - from: "package.json"
      to: "node_modules/zod"
      via: "npm install"
      pattern: "zod@3"
---

<objective>
Fix STRUCTURED_OUTPUT_SCHEMA_VALIDATION_FAILED errors by downgrading zod from v4 to v3 to resolve compatibility conflicts with @mastra/core and AI SDK dependencies.

Purpose: The installed zod@4.3.6 is incompatible with @mastra/core's transitive dependencies that require zod@^3.23.8 (specifically @ai-sdk/ui-utils-v5, @ai-sdk/provider-utils). This causes structured output schema validation to fail during testRule and testSentence tool executions. npm ls shows 12 "invalid" zod resolutions.

Output: Working zod v3 installation with zero invalid resolutions and passing type-check + build.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/3-fix-structured-output-schema-validation-/3-CONTEXT.md
@package.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Downgrade zod to v3 and clean install</name>
  <files>package.json</files>
  <action>
1. In package.json, change `"zod": "^4.3.6"` to `"zod": "^3.23.8"` in the dependencies section.
2. Delete node_modules and package-lock.json: `rm -rf node_modules package-lock.json`
3. Run `npm install` to get a clean dependency tree.
4. Run `npm ls zod 2>&1 | grep -c "invalid"` and confirm it outputs 0 (no invalid resolutions).
5. Confirm the installed zod version is 3.x: `node -e "console.log(require('zod/package.json').version)"` should print a 3.x version.

No source file changes needed. The codebase uses only standard zod APIs (z.object, z.string, z.literal, z.enum, z.array, z.union, z.discriminatedUnion, z.record, z.boolean, z.number, z.optional, z.infer) which are identical between zod v3 and v4.
  </action>
  <verify>
    <automated>cd /home/cervo/Code/LO-Solver && npm ls zod 2>&1 | grep -c "invalid" | grep -q "^0$" && echo "PASS: no invalid zod resolutions" || echo "FAIL: still has invalid zod resolutions"</automated>
  </verify>
  <done>package.json has zod@^3.23.8, npm ls zod shows zero invalid resolutions, node_modules/zod/package.json version is 3.x</done>
</task>

<task type="auto">
  <name>Task 2: Verify no regressions from zod downgrade</name>
  <files>package.json</files>
  <action>
1. Run `npx tsc --noEmit` — should pass with only the pre-existing globals.css error (which is expected and documented in CLAUDE.md). Any new type errors indicate a zod v3 incompatibility that needs fixing.
2. Run `npm run build` — should succeed. This confirms the Next.js build pipeline works with zod v3.
3. If either command fails with zod-related errors, investigate: likely cause would be a zod v4-only API used somewhere. Check the error message, find the offending import, and adjust to use the zod v3 equivalent. (Based on grep analysis, no v4-only APIs are used, so this should not happen.)
  </action>
  <verify>
    <automated>cd /home/cervo/Code/LO-Solver && npx tsc --noEmit 2>&1 | grep -v "globals.css" | grep -c "error TS" | grep -q "^0$" && echo "PASS: tsc clean" || echo "FAIL: tsc errors"</automated>
  </verify>
  <done>npx tsc --noEmit passes (only pre-existing globals.css error), npm run build succeeds with exit code 0</done>
</task>

</tasks>

<verification>
1. `npm ls zod 2>&1 | grep "invalid"` returns no results
2. `npx tsc --noEmit` passes (only globals.css error)
3. `npm run build` exits 0
</verification>

<success_criteria>
- zod@3.x installed (not 4.x)
- Zero "invalid" zod resolutions in npm ls
- TypeScript compilation passes
- Next.js production build succeeds
- No source code changes needed (only package.json dependency version)
</success_criteria>

<output>
After completion, create `.planning/quick/3-fix-structured-output-schema-validation-/3-SUMMARY.md`
</output>
