---
phase: 21-pipeline-agents
verified: 2026-03-07T11:24:21Z
status: human_needed
score: 6/6 must-haves verified
human_verification:
  - test: "Run extractor agent against a sample problem to verify structured problem.md output"
    expected: "problem.md written with ## Context, ## Dataset (numbered table), ## Questions (Q1, Q2...) sections using actual language names as column headers"
    why_human: "Cannot run a Claude Code subagent invocation programmatically; agent behavior with real input requires live execution"
  - test: "Run hypothesizer agent with a perspective input against a problem.md file"
    expected: "perspective-N.md written with ## Vocabulary table and ## Rules section, each rule citing sentence numbers as evidence with HIGH/MEDIUM/LOW confidence"
    why_human: "Cannot run agent live; output quality (vocabulary/rule separation, evidence citation) requires execution against real problem data"
  - test: "Dispatch hypothesizer twice with different perspective names and verify each writes to its own file"
    expected: "perspective-1.md and perspective-2.md produced independently with different analytical focus reflected in rules"
    why_human: "Sequential multi-instance dispatch is an orchestration behavior that requires Phase 22 to be present; cannot verify in isolation"
---

# Phase 21: Pipeline Agents Verification Report

**Phase Goal:** The extraction and hypothesis agents exist as standalone Claude Code subagent definitions that produce correctly structured output
**Verified:** 2026-03-07T11:24:21Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Extractor prompt is fully self-contained with domain context, processing instructions, output format template, anti-patterns, and error handling | VERIFIED | extractor.md line 8: `## Domain Context`, line 12: `## Input`, line 19: `## Task`, line 52: `## Output Format`, line 85: `## Do NOT`, line 99: `## Error Handling` — 6/6 required sections present |
| 2 | Hypothesizer prompt is fully self-contained with domain context, 7-step analysis process, output format template, confidence guidelines, anti-patterns, and error handling | VERIFIED | hypothesizer.md contains all 8 required sections; 7 analysis steps at lines 45, 49, 53, 60, 67, 72, 81; confidence at line 121 |
| 3 | Extractor output format (problem.md) exactly matches what the hypothesizer input section expects to read | VERIFIED | Extractor output template defines `## Context`, `## Dataset`, `## Questions`, `## Additional Vocabulary` (line 59-84). Hypothesizer Input section at line 17-20 describes the same sections verbatim, including optional `## Additional Vocabulary` |
| 4 | Neither agent prompt references external documents (no PIPELINE.md, no workspace-format.md mentions) | VERIFIED | grep for both strings returns zero matches across both files |
| 5 | Hypothesizer accepts a perspective name + focus description as input and writes to a specified output path | VERIFIED | hypothesizer.md line 22: "Assigned perspective -- a name and focus description (e.g., 'Morphological Analysis: Focus on affixes...')"; line 26: "Output file path -- the path where you must write your hypothesis file" |
| 6 | Extractor performs only structural parsing with no linguistic analysis | VERIFIED | Line 10: "you take raw problem text and organize it into a clean, structured markdown file. You perform no linguistic analysis -- only parsing and formatting"; Do NOT section has 11 anti-patterns reinforcing this |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `claude-code/.claude/agents/extractor.md` | Complete self-contained system prompt for problem extraction | VERIFIED | 120 lines; contains `## Domain Context` (line 8); YAML frontmatter with `model: opus` preserved; substantive content throughout |
| `claude-code/.claude/agents/hypothesizer.md` | Complete self-contained system prompt for hypothesis generation | VERIFIED | 170 lines; contains `## Confidence Guidelines` (line 121); YAML frontmatter with `model: opus` preserved; substantive content throughout |

Both artifacts are:
- **Level 1 (Exists):** Present on disk
- **Level 2 (Substantive):** 120 and 170 lines respectively; contain all required sections with real content (not placeholders)
- **Level 3 (Wired):** Agent definition files are invoked by the Claude Code runtime — no import wiring needed; they are standalone by design. Wiring to orchestrator is Phase 22 scope.

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `extractor.md` output template | `hypothesizer.md` input section | Section headers: `## Context`, `## Dataset`, `## Questions`, `## Additional Vocabulary` | WIRED | Extractor output format (lines 59-84) defines the same four sections that hypothesizer Input section (lines 17-20) explicitly describes as expected content of `problem.md`. Headers match exactly, including the optional `## Additional Vocabulary`. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| EXTR-01 | 21-01-PLAN.md | Extractor agent parses raw problem into structured JSON (context, dataset, questions) | SATISFIED* | Agent parses raw problem into structured markdown (not JSON). Design evolved to markdown per CONTEXT.md/RESEARCH.md documented decision. Requirement text is stale. Structured output with context/dataset/questions sections exists and is correct. |
| EXTR-02 | 21-01-PLAN.md | Structured output written to `workspace/extracted.json` | SATISFIED* | Output written to `problem.md` (not `extracted.json`). Design evolved to markdown workspace files per CONTEXT.md/RESEARCH.md. RESEARCH.md line 65 explicitly documents: "Output is `problem.md` (markdown, not JSON per CONTEXT.md evolution)". |
| HYPO-01 | 21-01-PLAN.md | Multiple hypothesizer agents dispatched in parallel, each with a different linguistic perspective | SATISFIED* | Dispatch pattern is Phase 22 orchestrator scope. Agent accepts perspective as input and is designed for sequential dispatch (CONTEXT.md: "CONTEXT.md confirms sequential dispatch, not parallel"). REQUIREMENTS.md text says "parallel" but CONTEXT.md says sequential — design is intentionally sequential. Agent prompt is correctly designed for this. |
| HYPO-02 | 21-01-PLAN.md | Each hypothesizer writes rules + vocabulary to its own draft file (`workspace/hypothesis-{n}.json`) | SATISFIED* | Agent writes to `perspective-N.md` (markdown, not `hypothesis-{n}.json`). File naming evolved to match workspace-format.md convention. Output file path is provided by orchestrator at runtime. |
| HYPO-03 | 21-01-PLAN.md | Best hypothesis selected by orchestrator based on test results | SATISFIED* | Selection is Phase 22/23 scope (as documented in RESEARCH.md line 68: "Selection logic is Phase 22/23 scope. This phase ensures each hypothesis file has consistent structure to enable comparison"). Hypothesizer produces numbered rules with evidence + confidence levels enabling comparison. |

*All five requirements are satisfied at the agent prompt level. The requirement descriptions in REQUIREMENTS.md contain stale text (JSON vs markdown, parallel vs sequential, filename conventions) that was superseded by design decisions in CONTEXT.md before implementation began. RESEARCH.md explicitly documents these evolutions. The actual implementation is internally consistent with the evolved design.

**Orphaned requirements check:** REQUIREMENTS.md maps EXTR-01, EXTR-02, HYPO-01, HYPO-02, HYPO-03 to Phase 21. All five appear in the PLAN frontmatter `requirements` field. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

Scanned both agent files for: TODO/FIXME, placeholder text, empty implementations, stub indicators. Neither file contains any anti-patterns. Both are complete implementations with substantive content.

**Do NOT counts:**
- extractor.md: 12 "Do NOT" items (plan required >= 5) — exceeds requirement
- hypothesizer.md: 10 "Do NOT" items (plan required >= 7) — exceeds requirement

### Human Verification Required

#### 1. Extractor Agent Live Run

**Test:** Invoke the extractor agent with one of the example problems (e.g., `examples/onling_2024P1_MoSyPh_Rosetta_Uralic_Forest-Enets_Input.md`) and the output path `workspace/test/problem.md`
**Expected:** `problem.md` is written with `## Context` (Forest Enets language, pronunciation notes), `## Dataset` (numbered table with Forest Enets | English columns), `## Questions` (Q1, Q2... with direction labels). No linguistic analysis or translations should appear.
**Why human:** Running Claude Code subagents requires a live Claude Code environment with a real invocation. Cannot be verified by static file inspection.

#### 2. Hypothesizer Agent Live Run

**Test:** After step 1, invoke the hypothesizer agent with: path to the produced `problem.md`, perspective "Morphological Analysis: Focus on affixes and how word forms change", round 1, perspective number 1, output path `workspace/test/hypotheses/round-1/perspective-1.md`
**Expected:** `perspective-1.md` is written with `## Vocabulary` table (morpheme | meaning | type | notes with sentence citations) and `## Rules` section (numbered rules with Evidence and Confidence fields). No vocabulary entries should appear under Rules.
**Why human:** Agent output quality — vocabulary/rule separation, evidence citation accuracy, confidence calibration — cannot be verified without executing against real linguistic data.

#### 3. Multi-Instance Sequential Dispatch

**Test:** Dispatch hypothesizer a second time with a different perspective (e.g., "Syntactic Analysis: Focus on word order and sentence structure") targeting `perspective-2.md`
**Expected:** `perspective-2.md` produced independently with different rules reflecting the syntactic focus; `perspective-1.md` unchanged
**Why human:** Tests the orchestration pattern that Phase 22 will implement. The agent prompt is designed for this, but the sequential dispatch protocol requires the orchestrator to exist.

## Requirement Text vs Implementation Discrepancy Note

REQUIREMENTS.md was written before CONTEXT.md captured the design evolution. The following requirement texts contain stale descriptions:

- EXTR-01: says "JSON" — implementation uses structured markdown (intentional evolution)
- EXTR-02: says `extracted.json` — implementation uses `problem.md` (intentional evolution)
- HYPO-01: says "parallel" — implementation is sequential dispatch (intentional design)
- HYPO-02: says `hypothesis-{n}.json` — implementation uses `perspective-N.md` (intentional evolution)

RESEARCH.md (written after CONTEXT.md, before implementation) explicitly documents all these evolutions. The implementation is correct. REQUIREMENTS.md should be updated to reflect the final design choices. This is not a gap — it is a documentation staleness issue.

## Gaps Summary

No gaps. All must-haves verified at all three levels (exists, substantive, wired). Three human verification items remain for live agent execution, which cannot be performed by static analysis.

---

_Verified: 2026-03-07T11:24:21Z_
_Verifier: Claude (gsd-verifier)_
