---
phase: quick
plan: 9
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - CLAUDE.md
autonomous: true
requirements: [QT-9]
must_haves:
  truths:
    - "NEXT_PORT=3001 npm run dev starts Next.js on port 3001 instead of 3000"
    - "MASTRA_PORT=4200 npm run dev starts Mastra on port 4200 instead of 4111"
    - "npm run dev without env vars still uses default ports 3000 and 4111"
    - "NEXT_PORT and MASTRA_PORT work on the individual dev:next and dev:mastra scripts too"
  artifacts:
    - path: "package.json"
      provides: "Updated dev scripts with port env var support"
      contains: "NEXT_PORT"
    - path: "CLAUDE.md"
      provides: "Updated command documentation reflecting port customization"
      contains: "NEXT_PORT"
  key_links: []
---

<objective>
Add customizable port parameters to the dev scripts in package.json so that Next.js and Mastra dev servers can be started on user-specified ports when the defaults (3000 and 4111) are already in use.

Purpose: When ports 3000/4111 are occupied, the dev servers fail to start. Custom port support removes this friction.
Output: Updated package.json scripts and CLAUDE.md documentation.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@package.json
@CLAUDE.md

<interfaces>
<!-- Port configuration behavior discovered from installed packages -->

Next.js dev (from `next dev --help`):
  -p, --port <port>  Specify a port number (default: 3000, env: PORT)

Mastra dev (from node_modules/mastra/dist/index.js line 1824):
  let portToUse = serverOptions?.port ?? process3.env.PORT;
  // Falls back to scanning ports 4111-4131 via get-port if PORT not set

Key constraint: Both tools read `PORT` env var. When running concurrently,
a shared `PORT` would set both to the same port. Solution: use separate env
vars `NEXT_PORT` and `MASTRA_PORT`, wired via shell expansion in npm scripts.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update package.json dev scripts with port env var support</name>
  <files>package.json</files>
  <action>
Update the three dev-related scripts in package.json to support `NEXT_PORT` and `MASTRA_PORT` environment variables:

1. `dev:next` — Change from `next dev --turbopack` to:
   `next dev --turbopack --port ${NEXT_PORT:-3000}`

2. `dev:mastra` — Change from `mastra dev` to:
   `PORT=${MASTRA_PORT:-4111} mastra dev`
   (Mastra reads process.env.PORT, so we set PORT from our custom MASTRA_PORT var)

3. `dev` — Change the concurrently command to use the updated sub-commands inline:
   `concurrently --names next,mastra --prefix-colors blue,magenta "next dev --turbopack --port ${NEXT_PORT:-3000}" "PORT=${MASTRA_PORT:-4111} mastra dev"`

This uses POSIX shell parameter expansion (`${VAR:-default}`) which works in npm scripts on Linux/macOS. The user is on WSL2 Linux.

Do NOT use `cross-env` or add new dependencies — shell expansion is sufficient for this Linux-based project.
  </action>
  <verify>
Run `node -e "const pkg = require('./package.json'); console.log(JSON.stringify(pkg.scripts, null, 2))"` and confirm the three dev scripts contain NEXT_PORT and MASTRA_PORT references with correct defaults.
  </verify>
  <done>
- `dev` script uses NEXT_PORT (default 3000) and MASTRA_PORT (default 4111)
- `dev:next` script uses NEXT_PORT (default 3000) via --port flag
- `dev:mastra` script sets PORT from MASTRA_PORT (default 4111)
- Running without env vars uses the same default ports as before (backward compatible)
  </done>
</task>

<task type="auto">
  <name>Task 2: Update CLAUDE.md command documentation</name>
  <files>CLAUDE.md</files>
  <action>
Update the Commands section in CLAUDE.md to document the new port customization:

1. Update the `npm run dev` bullet to mention port customization:
   - Keep the existing description of what it does
   - Add that ports can be customized with `NEXT_PORT` and `MASTRA_PORT` env vars
   - Add example: `NEXT_PORT=3001 MASTRA_PORT=4200 npm run dev`

2. Update the `dev:next` / `dev:mastra` bullets similarly, noting they support `NEXT_PORT` and `MASTRA_PORT` respectively.

Keep the documentation concise — one-line additions, not paragraphs. Follow existing CLAUDE.md style (dash-prefixed bullet points with backtick formatting).
  </action>
  <verify>
Read CLAUDE.md and confirm the Commands section mentions NEXT_PORT, MASTRA_PORT, and includes a usage example.
  </verify>
  <done>
- CLAUDE.md Commands section documents NEXT_PORT and MASTRA_PORT env vars
- Usage example included showing how to customize ports
- Documentation style matches existing CLAUDE.md conventions
  </done>
</task>

</tasks>

<verification>
1. `node -e "const pkg = require('./package.json'); const s = pkg.scripts; console.log(s.dev.includes('NEXT_PORT') && s.dev.includes('MASTRA_PORT') && s['dev:next'].includes('NEXT_PORT') && s['dev:mastra'].includes('MASTRA_PORT'))"` outputs `true`
2. `grep -c 'NEXT_PORT\|MASTRA_PORT' CLAUDE.md` returns at least 3 (env var mentioned in documentation)
</verification>

<success_criteria>
- npm run dev / dev:next / dev:mastra scripts accept custom ports via NEXT_PORT and MASTRA_PORT env vars
- Default behavior (no env vars set) is identical to current behavior (ports 3000 and 4111)
- CLAUDE.md documents the new port configuration options
</success_criteria>

<output>
After completion, create `.planning/quick/9-add-custom-port-parameter-to-npm-run-dev/9-SUMMARY.md`
</output>
