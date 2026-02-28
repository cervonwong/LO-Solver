# GSD (Get Shit Done) Installation Design

## Goal

Install the GSD meta-prompting framework for both Claude Code and OpenCode, locally in the LO-Solver project. Replace the existing `/plan-*` commands with GSD's planning workflow. Preserve the current statusline configuration.

## Decisions

- **Scope:** Local install only (project-level `.claude/commands/`)
- **Runtimes:** Claude Code + OpenCode
- **Hooks:** Skip both statusline and context monitor hooks (preserve existing statusline)
- **Old commands:** Remove `/plan-create`, `/plan-do`, `/plan-edit`, `/plan-list`, `/plan-review`
- **Existing plans:** Archive `docs/plans/` — all plans are already completed. Use as context for GSD project initialization if helpful.
- **Approach:** Run official installer, then post-install customization

## Architecture

### What GSD Installs (Local Mode)

```
.claude/commands/
  gsd:help.md
  gsd:new-project.md
  gsd:map-codebase.md
  gsd:discuss-phase.md
  gsd:plan-phase.md
  gsd:execute-phase.md
  gsd:verify-work.md
  gsd:quick.md
  gsd:settings.md
  gsd:add-phase.md
  gsd:insert-phase.md
  gsd:remove-phase.md
  gsd:list-phase-assumptions.md
  gsd:update.md
  ... (other GSD commands)

.planning/
  config.json
```

### What We Remove

```
.claude/commands/
  plan-create.md    (replaced by gsd:plan-phase / gsd:new-project)
  plan-do.md        (replaced by gsd:execute-phase)
  plan-edit.md      (no direct equivalent, but gsd:discuss-phase covers it)
  plan-list.md      (replaced by gsd:help / roadmap inspection)
  plan-review.md    (replaced by gsd:verify-work)
```

### What We Preserve

- `~/.claude/settings.json` — Existing statusline hook, model config, plugin config
- `.claude/settings.local.json` — MCP servers, mastra skill symlink
- `.claude/skills/mastra` symlink
- `docs/plans/` — Kept as historical archive

### GSD Configuration

`.planning/config.json`:
```json
{
  "mode": "interactive",
  "depth": "standard",
  "model_profile": "balanced",
  "planning": {
    "commit_docs": true,
    "search_gitignored": false
  },
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true,
    "nyquist_validation": true,
    "auto_advance": false
  },
  "git": {
    "branching_strategy": "none"
  }
}
```

## Migration Steps

1. Create git worktree `feature/gsd-setup`
2. Back up `~/.claude/settings.json`
3. Run `npx get-shit-done-cc --claude --opencode --local`
4. Restore `~/.claude/settings.json` from backup
5. Delete old `.claude/commands/plan-*.md` files
6. Move remaining current plans in `docs/plans/main.md` to completed section
7. Verify GSD command files are present
8. Configure `.planning/config.json`
9. Commit changes on the feature branch

## Post-Setup (Future Sessions)

- Run `/gsd:map-codebase` to analyze existing code
- Run `/gsd:new-project` to initialize PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md
- These are interactive GSD commands best run in a fresh session

## Risk Mitigation

- Settings.json backup/restore protects statusline and global config
- Worktree isolates changes until verified
- `.planning/` is committed to git for traceability
