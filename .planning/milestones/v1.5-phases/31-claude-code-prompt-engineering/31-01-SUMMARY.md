---
phase: 31-claude-code-prompt-engineering
plan: 01
subsystem: prompts
tags: [claude-code, xml-structure, confidence-scale, prompt-engineering, anthropic]

requires:
  - phase: 30-mastra-prompt-engineering
    provides: "6-level evidence-based confidence scale and hedged assertion style patterns"
provides:
  - "All 6 Claude Code agent prompts rewritten with XML-tagged sections, role-first structure, data-first ordering"
  - "6-level confidence scale (well-supported through unsupported) in 5 of 6 agents"
  - "Hedged assertion style in 4 agents (hypothesizer, improver, synthesizer, answerer)"
  - "Positive framing constraints replacing Do NOT lists in all 6 agents"
affects: []

tech-stack:
  added: []
  patterns:
    - "XML-tagged prompt structure (<role>, <context>, <input>, <task>, <output_format>, <guidelines>, <constraints>, <error_handling>)"
    - "Role-first ordering: <role> as first content after YAML frontmatter"
    - "Data-first ordering: <context> before <task> in all prompts"
    - "Positive constraint framing with motivation instead of Do NOT lists"
    - "Conditional tool guidance instead of blanket ALWAYS directives"

key-files:
  created: []
  modified:
    - "claude-code/.claude/agents/extractor.md"
    - "claude-code/.claude/agents/verifier.md"
    - "claude-code/.claude/agents/hypothesizer.md"
    - "claude-code/.claude/agents/improver.md"
    - "claude-code/.claude/agents/synthesizer.md"
    - "claude-code/.claude/agents/answerer.md"

key-decisions:
  - "Used 'critically analyze' as natural English in improver role (not aggressive emphasis)"
  - "Answerer confidence scale descriptions are role-specific (translation derivation) while using identical 6 level labels"
  - "Condensed hypothesizer 7-step analysis to 5 high-level stages preserving falsification and competing hypotheses"
  - "Preserved improver root cause reasoning as principles rather than prescriptive sub-steps"

patterns-established:
  - "XML-tagged prompt sections for Claude Code agents"
  - "6-level confidence scale for non-exempt agents"
  - "Hedged assertion style for reasoning agents"

requirements-completed: [PE-04]

duration: 7min
completed: 2026-03-10
---

# Phase 31 Plan 01: Claude Code Prompt Engineering Summary

**All 6 Claude Code agent prompts rewritten with XML-tagged sections, 6-level evidence-based confidence scale, hedged assertions, and positive constraint framing per Anthropic Opus 4.6 best practices**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-10T10:04:30Z
- **Completed:** 2026-03-10T10:11:53Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Replaced markdown heading structure with XML-tagged sections across all 6 agent prompts
- Applied role-first and data-first ordering per Anthropic guidance
- Replaced 3-level HIGH/MEDIUM/LOW confidence with 6-level evidence-based scale in 5 agents (extractor exempt)
- Added hedged assertion style guidance in 4 agents (extractor and verifier exempt)
- Reframed 52 total "Do NOT" items across 6 agents into positive instructions, scope boundaries, and motivated constraints
- Removed all CRITICAL/ALWAYS aggressive emphasis language
- Preserved error handling sections functionally intact in all 6 agents
- Updated YAML frontmatter descriptions for all agents

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite extractor and verifier prompts (exempt agents)** - `a564ff5` (feat)
2. **Task 2: Rewrite hypothesizer and improver prompts (rule discovery agents)** - `18d4521` (feat)
3. **Task 3: Rewrite synthesizer and answerer prompts (merge and answer agents)** - `c91ffa2` (feat)

## Files Created/Modified
- `claude-code/.claude/agents/extractor.md` - Structural parser with XML sections, no confidence scale, no hedging
- `claude-code/.claude/agents/verifier.md` - Single-item tester with XML sections, PASS/FAIL/NEEDS_UPDATE vocabulary
- `claude-code/.claude/agents/hypothesizer.md` - Hypothesis generator with XML sections, 6-level confidence, hedged assertions, condensed 5-stage analysis
- `claude-code/.claude/agents/improver.md` - Rule reviser with XML sections, 6-level confidence, hedged assertions, root cause principles
- `claude-code/.claude/agents/synthesizer.md` - Ruleset merger with XML sections, 6-level confidence, hedged assertions, merge-specific confidence context
- `claude-code/.claude/agents/answerer.md` - Translator with XML sections, 6-level confidence, hedged assertions, best-attempt policy

## Decisions Made
- Used "critically analyze" as natural English in improver role definition (not "CRITICAL" emphasis directive) -- grep match is a false positive
- Customized answerer's confidence scale descriptions for translation context (measuring derivation completeness rather than rule evidence) while keeping identical 6 level labels
- Condensed hypothesizer's 7-step analysis process to 5 high-level stages, preserving the key unique items: falsification, competing hypotheses, and Occam's Razor guidance
- Preserved improver's 6 root cause reasoning principles (logical order, abductive reasoning, multiple hypotheses, adaptability, grounding, persistence) as high-level principles rather than prescriptive sub-steps

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 6 Claude Code agent prompts follow Anthropic Opus 4.6 best practices
- Phase 32 (Frontend Cleanup) can proceed independently

## Self-Check: PASSED

All 7 files verified present. All 3 task commits verified in git log.

---
*Phase: 31-claude-code-prompt-engineering*
*Completed: 2026-03-10*
