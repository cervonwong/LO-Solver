# GSD Installation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Install the GSD meta-prompting framework locally for Claude Code and OpenCode, replacing existing plan commands while preserving the current statusline.

**Architecture:** Run the official GSD npm installer with `--local` flags for both Claude and OpenCode. Post-install, remove the hooks/statusline it adds to project-level settings, delete old plan commands, and archive existing plans. The work happens in a git worktree.

**Tech Stack:** GSD (get-shit-done-cc npm package), Claude Code, OpenCode

---

### Task 1: Create worktree and prepare environment

**Files:**
- Create: git worktree at `.claude/worktrees/` (branch `feature/gsd-setup`)

**Step 1: Create the worktree**

Use the `EnterWorktree` tool with name `gsd-setup`.

**Step 2: Copy .env to worktree**

```bash
cp ../../.env .env
```

(Worktree is 2 levels deep inside `.claude/worktrees/gsd-setup/`)

**Step 3: Verify worktree is ready**

```bash
git branch --show-current
ls .claude/commands/
```

Expected: Branch is something like `worktree/gsd-setup`, and existing plan commands are visible.

---

### Task 2: Run GSD installer

**Step 1: Run the installer for Claude Code (local)**

```bash
npx get-shit-done-cc@latest --claude --local
```

Expected: Installer creates:
- `.claude/commands/gsd/*.md` (30 command files)
- `.claude/get-shit-done/` (core runtime: bin/, references/, templates/, workflows/)
- `.claude/agents/gsd-*.md` (11 agent files)
- `.claude/hooks/gsd-*.js` (3 hook files)
- `.claude/package.json`
- `.claude/gsd-file-manifest.json`
- `.claude/settings.json` (project-level, with hooks + statusline)

**Step 2: Run the installer for OpenCode (local)**

```bash
npx get-shit-done-cc@latest --opencode --local
```

Expected: Installer creates:
- `.opencode/command/gsd-*.md` (30 command files, flat naming)
- `.opencode/get-shit-done/` (core runtime)
- `.opencode/agents/gsd-*.md` (11 agent files)
- `.opencode/hooks/gsd-*.js` (3 hook files)
- `.opencode/package.json`
- `.opencode/gsd-file-manifest.json`
- `.opencode/opencode.json` (permissions)

**Step 3: Verify installation**

```bash
ls .claude/commands/gsd/ | head -5
ls .claude/agents/gsd-* | head -3
ls .claude/get-shit-done/VERSION
ls .opencode/command/gsd-* | head -5
```

Expected: GSD files exist in both locations.

---

### Task 3: Remove GSD hooks and statusline from project settings

The installer creates `.claude/settings.json` (project-level) with hooks and statusline. We need to remove the hooks and statusline entries since we want to keep the global statusline and don't want GSD's context monitor.

**Files:**
- Modify: `.claude/settings.json` (created by installer in Task 2)

**Step 1: Read the installer-created settings.json**

Read `.claude/settings.json` to see what the installer added.

**Step 2: Remove hooks and statusline entries**

Remove the following from `.claude/settings.json`:
- `hooks.SessionStart` array (contains `gsd-check-update.js`)
- `hooks.PostToolUse` array (contains `gsd-context-monitor.js`)
- `statusLine` object (contains `gsd-statusline.js`)
- The entire `hooks` key if it's now empty

If the file has no other settings besides hooks and statusLine, delete it entirely (the global `~/.claude/settings.json` has our real config).

**Step 3: Verify global settings are untouched**

```bash
cat ~/.claude/settings.json
```

Expected: Still contains the original statusline command (`bash ~/.claude/statusline-command.sh`), model, plugins config. No GSD hooks.

---

### Task 4: Delete old plan commands

**Files:**
- Delete: `.claude/commands/plan-create.md`
- Delete: `.claude/commands/plan-do.md`
- Delete: `.claude/commands/plan-edit.md`
- Delete: `.claude/commands/plan-list.md`
- Delete: `.claude/commands/plan-review.md`

**Step 1: Remove old command files**

```bash
rm .claude/commands/plan-create.md
rm .claude/commands/plan-do.md
rm .claude/commands/plan-edit.md
rm .claude/commands/plan-list.md
rm .claude/commands/plan-review.md
```

**Step 2: Verify only GSD commands remain**

```bash
ls .claude/commands/
```

Expected: Only the `gsd/` subdirectory remains (no more `plan-*.md` files).

---

### Task 5: Archive existing plans in main.md

**Files:**
- Modify: `docs/plans/main.md`

**Step 1: Move current plans to completed section**

Move all 6 entries from the "Current Plans" table to the "Completed Plans" table (including the GSD design doc we just added). Change their status to "Done".

The entries to move:
- `2026-02-27-separate-verify-improve-blocks-plan` → Done
- `2026-02-28-dynamic-duck-messages-design` → Done
- `2026-02-28-dynamic-duck-messages-plan` → Done
- `2026-02-28-ui-polish-and-duck-mascots-design` → Done
- `2026-02-28-ui-polish-and-duck-mascots-plan` → Done
- `2026-02-28-gsd-installation-design` → Done

**Step 2: Add this plan to current plans then immediately to completed**

Add `2026-02-28-gsd-installation-plan` to "Completed Plans" with status "Done".

**Step 3: Verify main.md**

Read `docs/plans/main.md` and confirm:
- "Current Plans" section is empty (or has an empty table)
- All plans appear in "Completed Plans"

---

### Task 6: Update .gitignore for GSD artifacts

**Files:**
- Modify: `.gitignore`

**Step 1: Check what GSD recommends ignoring**

GSD's `.planning/` directory should be committed (`planning.commit_docs: true`). But some runtime artifacts may need ignoring.

Add to `.gitignore`:
```
# GSD hooks and runtime (installed per-developer via npx get-shit-done-cc)
.claude/hooks/
.claude/agents/gsd-*.md
.claude/get-shit-done/
.claude/package.json
.claude/gsd-file-manifest.json
.opencode/
```

The GSD commands (`.claude/commands/gsd/`) should be committed so other developers get them.

**Step 2: Verify gitignore**

```bash
git status
```

Expected: Only the intended files show as tracked changes. GSD runtime files should be ignored.

---

### Task 7: Commit all changes

**Step 1: Stage relevant files**

```bash
git add .claude/commands/gsd/ .opencode/ docs/plans/ .gitignore
git add -u .claude/commands/  # catches deleted plan-*.md files
```

**Step 2: Check what's staged**

```bash
git status
```

Expected: New GSD command files, deleted old plan commands, updated main.md, updated .gitignore.

**Step 3: Commit**

```bash
git commit -m "Install GSD framework, replace plan commands

- Install GSD (get-shit-done-cc) locally for Claude Code and OpenCode
- Remove old /plan-create, /plan-do, /plan-edit, /plan-list, /plan-review commands
- Remove GSD statusline and hooks (preserve existing statusline)
- Archive all existing plans as completed
- Add .gitignore entries for GSD runtime artifacts

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Verify GSD is functional

**Step 1: List GSD commands**

```bash
ls .claude/commands/gsd/
```

Expected: 30 `.md` files including `help.md`, `new-project.md`, `plan-phase.md`, `execute-phase.md`, etc.

**Step 2: Verify command content is sensible**

```bash
head -5 .claude/commands/gsd/help.md
```

Expected: GSD help command frontmatter and content.

**Step 3: Verify no old commands remain**

```bash
ls .claude/commands/ | grep plan
```

Expected: No results (old plan commands deleted, GSD uses `plan-phase` inside `gsd/`).

**Step 4: Verify global settings untouched**

```bash
cat ~/.claude/settings.json
```

Expected: Original statusline, model, plugins — no GSD hooks.

---

## Post-Setup Instructions (For User)

After merging this branch, in a fresh Claude Code session:

1. **`/gsd:map-codebase`** — Let GSD analyze the existing LO-Solver codebase
2. **`/gsd:new-project`** — Initialize PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md
3. **`/gsd:help`** — See all available GSD commands

For OpenCode, the equivalent commands use dashes: `/gsd-map-codebase`, `/gsd-new-project`, `/gsd-help`.
