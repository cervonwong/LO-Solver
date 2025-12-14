# Repository Guidelines

## Project Structure & Module Organization

- Core runtime lives in `src/mastra/index.ts` and wires agents, scorers, and workflows.
- Experiment workflows which are the main drivers of the system live in `src/mastra/<workflow-name>/workflow.ts`.
- Example prompts/data are in `examples/`. Local run artifacts (`mastra.db*`) and execution traces land in `logs/`; keep them out of commits.
- TypeScript configuration is in `tsconfig.json`; package scripts and dependencies are in `package.json`.

## Development Behaviors (Agents)

- Do **not** run `npm run dev`, `npm run build`, `npm run start`, or other npm scripts automatically.
- After modifying code, always run `npx tsc --noEmit` to confirm the TypeScript build remains clean; report any errors with file/line details.
- Before commits, rerun `npx tsc --noEmit` and summarize the outcome in notes or PR descriptions.
- Prefer read-only inspection for stateful files (`mastra.db*`, `logs/`); avoid regenerating or deleting them unless explicitly asked.

## Coding Style & Naming Conventions

- Do not write comments with words like "Better", "Improved", "Enhanced" when refactoring. Comments should remain neutral and just describe what the code is CURRENTLY doing.
- Language: TypeScript (ES modules). Prefer named exports; keep files focused on a single agent/workflow.
- Formatting: Prettier (`.prettierrc`) with 2-space indent, single quotes, and trailing commas. Run your formatter before pushing.
