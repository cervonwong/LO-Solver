# Phase 26: Documentation Consistency Cleanup - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix stale documentation so all docs accurately reflect the implemented design decisions. Covers CLAUDE.md, REQUIREMENTS.md, and ROADMAP.md. No code changes — documentation only.

</domain>

<decisions>
## Implementation Decisions

### Design evolution annotations
- Update requirement text directly to match implementation, with inline parenthetical evolution notes
- Evolution notes should include a brief reason but NOT phase references (e.g., "(changed from parallel to sequential: deterministic perspective ordering)")
- Uncheck evolved requirements first, update wording, then recheck — creates clean audit trail in git history
- Keep same requirement IDs — no version suffixes. Git history tracks changes

### Stale text cleanup scope
- Fix the 3 audit-identified items (CLAUDE.md exception, REQUIREMENTS.md wording, ROADMAP SC5)
- Additionally sweep ALL ROADMAP success criteria for stale references (e.g., "JSON" when implementation uses markdown)
- Update stale SCs in completed phases too — the roadmap should be accurate as a historical record
- Do NOT expand to codebase maps or phase-level docs — only CLAUDE.md, REQUIREMENTS.md, ROADMAP.md

### CLAUDE.md verifier exception
- Note the Sonnet exception inline on the existing model convention line, not as a separate bullet
- E.g., "Models chosen per agent: GPT-5-mini for extraction/testing, Gemini 3 Flash for reasoning (verifier uses Sonnet for cost efficiency)"

### Claude's Discretion
- Exact wording of evolution notes per requirement
- Whether a ROADMAP SC is actually stale or still accurate
- Order of operations for the uncheck/update/recheck cycle

</decisions>

<specifics>
## Specific Ideas

- The v1.4 audit identified these specific stale items:
  - INT-02: CLAUDE.md says "every agent MUST use Opus" but verifier uses Sonnet
  - REQUIREMENTS.md: JSON→markdown for workspace files (EXTR-02, HYPO-02, VERI-02, IMPR-02, ANSR-02, OUTP-03)
  - REQUIREMENTS.md: parallel→sequential for hypothesizer dispatch (HYPO-01)
  - ROADMAP SC5 (Phase 22): says "valid JSON" but pipeline uses markdown files

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.planning/v1.4-MILESTONE-AUDIT.md` — comprehensive audit with exact requirement IDs and descriptions of what changed

### Established Patterns
- REQUIREMENTS.md uses `- [x]` checkbox format with requirement IDs like `HYPO-01`
- CLAUDE.md model convention is a single bullet under "Key Patterns"
- ROADMAP.md success criteria are numbered lists under each phase detail section

### Integration Points
- CLAUDE.md is loaded into every Claude Code conversation — accuracy is critical
- REQUIREMENTS.md is referenced by phase plans and verification docs
- ROADMAP.md success criteria are used by gsd-verifier agents

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 26-documentation-consistency-cleanup*
*Context gathered: 2026-03-08*
