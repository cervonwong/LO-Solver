---
phase: quick
plan: 6
type: execute
wave: 1
depends_on: []
files_modified: [src/mastra/index.ts]
autonomous: true
requirements: [fix-observability-deprecation]
must_haves:
  truths:
    - "Mastra dev server starts without the deprecation warning about default: { enabled: true }"
    - "Mastra Studio still receives traces (DefaultExporter active)"
  artifacts:
    - path: "src/mastra/index.ts"
      provides: "Mastra initialization with explicit observability config"
      contains: "DefaultExporter"
  key_links:
    - from: "src/mastra/index.ts"
      to: "@mastra/observability"
      via: "import { Observability, DefaultExporter }"
      pattern: "new DefaultExporter"
---

<objective>
Migrate Mastra observability configuration from the deprecated `default: { enabled: true }` format to the new explicit exporter format using `DefaultExporter`.

Purpose: Eliminate the deprecation warning printed on every server start, future-proofing against the removal of the deprecated API.
Output: Updated `src/mastra/index.ts` with non-deprecated observability config.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/mastra/index.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update Mastra observability config to use explicit exporters</name>
  <files>src/mastra/index.ts</files>
  <action>
In `src/mastra/index.ts`, update the import and the observability configuration:

1. Change the import line from:
   `import { Observability } from '@mastra/observability';`
   to:
   `import { Observability, DefaultExporter } from '@mastra/observability';`

2. Replace the observability config from:
   ```
   observability: new Observability({
     default: { enabled: true },
   }),
   ```
   to:
   ```
   observability: new Observability({
     configs: {
       default: {
         serviceName: 'lo-solver',
         exporters: [new DefaultExporter()],
       },
     },
   }),
   ```

Do NOT include `CloudExporter` (this project does not use Mastra Cloud and has no `MASTRA_CLOUD_ACCESS_TOKEN`). Do NOT include `SensitiveDataFilter` as there is no need to redact sensitive data from local traces.

The `configs` object uses a `default` key which becomes the config name. `serviceName` is required by the `ObservabilityInstanceConfig` interface. `DefaultExporter` persists traces to configured storage for Mastra Studio, which is the behavior we want to preserve.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -v "globals.css" | grep -c "error" | grep -q "^0$" && echo "PASS: no new type errors" || echo "FAIL: type errors found"</automated>
  </verify>
  <done>The deprecated `default: { enabled: true }` config is replaced with explicit `configs` using `DefaultExporter`. TypeScript compiles without new errors. The deprecation warning will no longer appear when the dev server starts.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` reports no new errors (only the pre-existing globals.css one)
- `src/mastra/index.ts` contains `new DefaultExporter()` and does NOT contain `default: { enabled: true }`
- The import includes `DefaultExporter` from `@mastra/observability`
</verification>

<success_criteria>
The Mastra observability deprecation warning is eliminated. Traces continue to be persisted to storage for Mastra Studio via DefaultExporter.
</success_criteria>

<output>
After completion, create `.planning/quick/6-fix-mastra-observability-warning/6-SUMMARY.md`
</output>
