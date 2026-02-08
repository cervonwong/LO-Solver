# Execute Implementation Plan

Execute an existing implementation plan using subagent delegation.

## Required Skills

Before starting, invoke these skills:
1. `executing-plans` - Batch execution with checkpoints

During execution, also use:
- `systematic-debugging` - If bugs encountered
- `verification-before-completion` - Before claiming done

## Subagent Delegation Pattern

**The main agent acts as orchestrator. Delegate everything to subagents:**

| Task | Delegate? | Why |
|------|-----------|-----|
| Implementing each stage/task | Yes | Fresh context, focused scope |
| Running tests | Yes | Subagent can iterate on failures |
| Writing commits | Yes | Consistent commit messages |
| Debugging failures | Yes | Isolated investigation |
| Code review | Yes | Fresh perspective |

**Main agent responsibilities (do NOT delegate):**
- Loading and parsing the plan
- Deciding task order and batching
- Reviewing subagent output before proceeding
- Making go/no-go decisions between stages
- Handling cross-stage context and rollback decisions

**Why this pattern:**
- Subagents get fresh context = no confusion between stages
- Main agent maintains full project context across all stages
- If subagent gets stuck, main agent can intervene with broader context
- Clear separation: orchestration vs execution

**Subagent prompts should include:**
- Exact scope (which files, which changes)
- Verification commands to run
- What to report back (files changed, issues encountered, success/failure)

## Do NOT (Orchestrator Anti-Patterns)

**Never do these directly as orchestrator:**
- Run `git status`, `git diff`, or any git commands for committing
- Write code or make file changes
- Run tests or verification commands
- Debug failures

**Why:** You are the orchestrator. Your job is to delegate, review, and decide. The moment you start executing, you pollute your context and lose the fresh-subagent advantage.

**If you catch yourself about to run a command:** STOP. Dispatch a subagent instead.

## Process

1. **Load plan** - Read the specified plan file
2. **Update index** - Set status to "Active" in `docs/plans/main.md`
3. **Review critically** - Identify questions or concerns
4. **Execute via subagents** - Dispatch subagent per task/stage
5. **Review subagent output** - Check diff, verify success
6. **Commit via subagent** - Commit after each stage
7. **Continue** - Next stage or handle failures
8. **Complete** - Use `finishing-a-development-branch` skill
9. **Update index** - Move plan to "Completed Plans" section in `docs/plans/main.md`

## Updating main.md

**When starting execution:**
- Change plan status from "Pending" to "Active" in Current Plans table

**When completing execution:**
- Remove plan from "Current Plans" table
- Add plan to "Completed Plans" section

## Arguments

$ARGUMENTS - Path to plan file (e.g., `docs/plans/2024-01-15-auth-feature.md`)
