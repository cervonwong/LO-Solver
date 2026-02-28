# Technology Stack

## Core Technologies
- Language: TypeScript 5.9.3 (strict mode, ES modules with `"type": "module"`)
- Runtime: Node.js >= 22.13.0
- Framework: Next.js 16.1.6 (React 19.2.4, App Router, server + client components)
- Build system: Turbopack (dev via `next dev --turbopack`), Next.js production build (`next build`)
- AI orchestration: Mastra 1.3.5 (CLI) / @mastra/core 1.8.0 (runtime), with Mastra dev server on port 4111

## Key Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `@mastra/core` | ^1.8.0 | AI agent orchestration framework: agents, workflows, tools, request contexts |
| `@mastra/ai-sdk` | ^1.1.0 | Bridge between Mastra workflows and Vercel AI SDK streaming |
| `@mastra/evals` | ^1.1.2 | Evaluation scorers (completeness scorer used in Workflow 01) |
| `@mastra/libsql` | ^1.6.2 | LibSQL/SQLite storage adapter for Mastra (local `mastra.db` file) |
| `@mastra/loggers` | ^1.0.2 | PinoLogger integration for structured logging |
| `@mastra/memory` | ^1.5.2 | Agent memory module (listed as external package in Next.js config) |
| `@mastra/observability` | ^1.2.1 | Built-in observability (tracing/telemetry) for Mastra agents and workflows |
| `@openrouter/ai-sdk-provider` | ^2.1.1 | AI SDK-compatible provider for OpenRouter multi-model API |
| `ai` | ^6.0.101 | Vercel AI SDK: `createUIMessageStreamResponse`, `DefaultChatTransport`, streaming primitives |
| `@ai-sdk/react` | ^3.0.103 | React hooks for AI SDK (`useChat`) |
| `next` | ^16.1.6 | Full-stack React framework (App Router, API routes, server components) |
| `react` | ^19.2.4 | UI library |
| `react-dom` | ^19.2.4 | React DOM renderer |
| `zod` | ^4.3.6 | Schema validation for workflow step I/O, agent structured output, and tool parameters |
| `radix-ui` | ^1.4.3 | Headless UI primitives (used via shadcn/ui components) |
| `cmdk` | ^1.1.1 | Command palette component (used in shadcn Command component) |
| `lucide-react` | ^0.575.0 | Icon library |
| `class-variance-authority` | ^0.7.1 | Variant-based CSS class composition for UI components |
| `clsx` | ^2.1.1 | Conditional CSS class name utility |
| `tailwind-merge` | ^3.5.0 | Tailwind CSS class deduplication and merging |
| `react-resizable-panels` | ^4.6.5 | Resizable panel layout (main page left/right and top/bottom splits) |
| `streamdown` | ^2.3.0 | Markdown stream renderer |
| `@streamdown/code` | ^1.0.3 | Code block rendering plugin for streamdown |

## Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.9.3 | TypeScript compiler and type checker |
| `mastra` | ^1.3.5 | Mastra CLI (`mastra dev` starts dev server with Studio at port 4111) |
| `concurrently` | ^9.2.1 | Run Next.js and Mastra dev servers in parallel |
| `tailwindcss` | ^4.2.1 | Utility-first CSS framework (v4) |
| `@tailwindcss/postcss` | ^4.2.1 | PostCSS plugin for Tailwind CSS v4 |
| `postcss` | ^8.5.6 | CSS transformation pipeline |
| `tw-animate-css` | ^1.4.0 | Tailwind CSS animation utilities |
| `prettier` | 3.8.1 | Code formatter (2-space indent, single quotes, 100 char width) |
| `shadcn` | ^3.8.5 | CLI for adding shadcn/ui components (`npx shadcn@latest add <name>`) |
| `@types/node` | ^25.2.2 | Node.js type definitions |
| `@types/react` | ^19.2.14 | React type definitions |
| `@types/react-dom` | ^19.2.3 | React DOM type definitions |

## Configuration Files
- `tsconfig.json`: TypeScript config -- strict mode, ESNext modules, bundler resolution, target ES2020, path aliases `@/*` -> `./src/*` and `@examples/*` -> `./examples/*`, Next.js plugin
- `next.config.ts`: Next.js config -- externalizes `@mastra/core`, `@mastra/libsql`, `@mastra/memory`, `better-sqlite3` from server bundles; Turbopack root directory set
- `postcss.config.cjs`: PostCSS config -- uses `@tailwindcss/postcss` plugin (Tailwind v4 integration)
- `.prettierrc`: Prettier config -- semicolons, trailing commas, single quotes, 100 char print width, 2-space tabs, auto line endings
- `.prettierignore`: Excludes build artifacts, env files, databases, examples, and `.mastra` directory from formatting
- `.gitignore`: Excludes `node_modules`, `dist`, `.mastra`, `.next`, `.env`, `*.db`, `logs/`, `.worktrees/`, GSD hooks and runtime files
- `.env.example`: Template for required/optional environment variables
- `.vscode/mcp.json`: VS Code MCP server config for Mastra documentation
- `package.json`: Project manifest with `"type": "module"` and `"engines": { "node": ">=22.13.0" }`
