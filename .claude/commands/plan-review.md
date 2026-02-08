# Review Implementation

Review completed implementation against plan or requirements.

## Required Skills

Before starting, invoke these skills:
1. `requesting-code-review` - Dispatch code reviewer subagent
2. `verification-before-completion` - Evidence before claims

## Process

1. **Identify scope** - What was implemented (commits, files changed)
2. **Run verification** - Type-check with `npx tsc --noEmit`
3. **Dispatch reviewer** - Use requesting-code-review skill
4. **Report findings** - Show verification output + review results
5. **Address issues** - Fix Critical/Important issues before proceeding

## Arguments

$ARGUMENTS - What to review (plan path, commit range, or "recent" for last changes)
