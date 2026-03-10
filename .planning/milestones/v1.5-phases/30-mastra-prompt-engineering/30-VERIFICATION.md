---
phase: 30-mastra-prompt-engineering
verified: 2026-03-09T09:00:00Z
status: gaps_found
score: 10/13 must-haves verified
re_verification: false
gaps:
  - truth: "A testing-mode eval run completes successfully after all 12 prompt rewrites"
    status: failed
    reason: "Eval run was deferred to the user and has not been executed. No evals/results/ directory exists."
    artifacts: []
    missing:
      - "Run npm run eval -- --comparison and confirm results JSON is created in evals/results/"
  - truth: "The eval run uses --comparison flag to show workflow vs zero-shot scores"
    status: failed
    reason: "Eval run was deferred; no results file exists to confirm comparison mode was used."
    artifacts: []
    missing:
      - "Included in the eval run above — run with --comparison flag"
  - truth: "No catastrophic regression: workflow scores are not significantly worse than pre-rewrite expectations"
    status: failed
    reason: "Cannot assess regression without eval results. No baseline was captured before rewrites (PE-01 SKIPPED per user decision) and no post-rewrite eval has been run."
    artifacts: []
    missing:
      - "Run eval and confirm workflow scores are competitive with zero-shot"
human_verification:
  - test: "Run npm run eval -- --comparison and review scores"
    expected: "Eval completes without Zod validation errors, translation-accuracy scores are recorded, workflow scores are competitive with or better than zero-shot"
    why_human: "Eval makes live API calls to OpenRouter — cannot run programmatically in verification. User must confirm acceptable performance."
---

# Phase 30: Mastra Prompt Engineering Verification Report

**Phase Goal:** Rewrite all Mastra agent prompts using model-specific prompting best practices
**Verified:** 2026-03-09T09:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All 5 GPT-5-mini instruction files use XML section tags instead of markdown headers | VERIFIED | `<role>` tags confirmed in all 5 files; markdown headers inside `<example>` blocks are intentional (sample input, not structural) |
| 2 | Extractor prompts lead with JSON output schema before any processing instructions | VERIFIED | `<output_schema>` at lines 12, 11, 11 in the 3 extractor files; `<extraction_rules>` at lines 36, 42, 46 respectively — schema always precedes rules |
| 3 | Tester prompts have crisp 1-2 sentence tool descriptions with clear success/failure criteria | VERIFIED | `03a-rule-tester-instructions.ts` has 1-line tool note + 6-value status enum; `03a-sentence-tester-instructions.ts` has 1-line tool note + 3-value status enum |
| 4 | Agents that deal with confidence use the 6-level evidence-based scale (well-supported through unsupported) mapped to HIGH/MEDIUM/LOW Zod enum | VERIFIED | Scale confirmed in `03b2-rules-improvement-extractor-instructions.ts` (`<confidence_scale>` section), `rules-tools-prompt.ts` (guideline 4), `03b-rules-improver-instructions.ts` (`<evidence_assessment>`), and `04-question-answerer-instructions.ts` (`<evidence_assessment>`) |
| 5 | Hedged assertion style replaces any unqualified confidence language | VERIFIED | `03a-verifier-orchestrator-instructions.ts` has explicit hedged examples; `03b-rules-improver-instructions.ts` and `04-question-answerer-instructions.ts` both have hedged language directives |
| 6 | All 7 Gemini 3 Flash instruction files use XML-delimited sections exclusively (no markdown headers for structure) | VERIFIED | `<role>` tags confirmed in all 7 files; no markdown headers found in structural positions (3 instances in example/output blocks are intentional) |
| 7 | No explicit chain-of-thought scaffolding in any Gemini prompt | VERIFIED | No "Step 1:/Step 2:" patterns found in any of the 7 Gemini files; `<approach>` sections are present but use numbered lists inside a bounded section, not freeform scaffolding |
| 8 | Template injection slots preserved exactly in hypothesizer, synthesizer, and rules-improver | VERIFIED | `{{RULES_TOOLS_INSTRUCTIONS}}` confirmed in hypothesizer and synthesizer; `{{VOCABULARY_TOOLS_INSTRUCTIONS}}` confirmed in hypothesizer, synthesizer, and rules-improver; rules-improver correctly has NO `{{RULES_TOOLS_INSTRUCTIONS}}` |
| 9 | rules-tools-prompt.ts confidence guidelines use the 6-level evidence-based scale with Zod mapping | VERIFIED | "well-supported...Output as HIGH" through "unsupported...Output as LOW" present at lines 45-53 |
| 10 | All agents dealing with confidence use consistent 6-level scale vocabulary | VERIFIED | Scale found in rules-tools-prompt.ts (injected into hypothesizer and synthesizer), explicitly in rules-improver, question-answerer, and rules-improvement-extractor |
| 11 | A testing-mode eval run completes successfully after all 12 prompt rewrites | FAILED | No `evals/results/` directory exists; eval was deferred to user in Plan 03 Summary |
| 12 | The eval run uses --comparison flag to show workflow vs zero-shot scores | FAILED | Depends on eval run above; no results to confirm |
| 13 | No catastrophic regression: workflow scores are not significantly worse than pre-rewrite expectations | FAILED | No baseline was captured (PE-01 SKIPPED per user decision) and no post-rewrite eval results exist |

**Score:** 10/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/mastra/workflow/01-structured-problem-extractor-instructions.ts` | GPT-5-mini extraction prompt with XML structure and grounding principle | VERIFIED | XML sections present, grounding principle at line 8, schema-first at line 12 |
| `src/mastra/workflow/03a-rule-tester-instructions.ts` | GPT-5-mini tester prompt with tool descriptions and status criteria | VERIFIED | XML sections present, 6-value status enum, evidence-quoting constraints |
| `src/mastra/workflow/03a-sentence-tester-instructions.ts` | GPT-5-mini tester prompt with tool descriptions and translation criteria | VERIFIED | XML sections present, 3-value status enum, suggestion likelihood preserved as 3-level |
| `src/mastra/workflow/03a2-verifier-feedback-extractor-instructions.ts` | GPT-5-mini extraction prompt with output schema and extraction rules | VERIFIED | XML sections present, grounding principle, schema includes ALL_RULES_PASS enum |
| `src/mastra/workflow/03b2-rules-improvement-extractor-instructions.ts` | GPT-5-mini extraction prompt with confidence scale integration | VERIFIED | `<confidence_scale>` section maps 6 levels to HIGH/MEDIUM/LOW |
| `src/mastra/workflow/rules-tools-prompt.ts` | Updated shared rules tools prompt with 6-level confidence scale | VERIFIED | Guideline 4 updated to full 6-level scale at lines 44-53 |
| `src/mastra/workflow/02-dispatcher-instructions.ts` | Gemini XML-structured dispatcher prompt | VERIFIED | `<role>`, `<task>`, `<reference_patterns>`, `<output>`, `<constraints>` sections present |
| `src/mastra/workflow/02-improver-dispatcher-instructions.ts` | Gemini XML-structured improver dispatcher prompt | VERIFIED | `<role>`, `<task>`, `<rules>`, `<output>`, `<constraints>` sections present |
| `src/mastra/workflow/02-initial-hypothesizer-instructions.ts` | Gemini XML-structured hypothesizer prompt with template slots | VERIFIED | Both template slots in `<tools>` section; `<evidence_assessment>` section present |
| `src/mastra/workflow/02-synthesizer-instructions.ts` | Gemini XML-structured synthesizer prompt with template slots | VERIFIED | Both template slots in `<tools>` section; `<merge_strategy>` and `<evidence_assessment>` present |
| `src/mastra/workflow/03a-verifier-orchestrator-instructions.ts` | Gemini XML-structured verifier orchestrator prompt | VERIFIED | `<evidence_assessment>` with hedged assertion examples |
| `src/mastra/workflow/03b-rules-improver-instructions.ts` | Gemini XML-structured rules improver prompt with template slot | VERIFIED | `{{VOCABULARY_TOOLS_INSTRUCTIONS}}` in `<tools>`; full 6-level scale in `<evidence_assessment>` |
| `src/mastra/workflow/04-question-answerer-instructions.ts` | Gemini XML-structured question answerer prompt with confidence scale | VERIFIED | Full 6-level scale in `<evidence_assessment>`; hedged language directive present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `03b2-rules-improvement-extractor-instructions.ts` | `workflow-schemas.ts` ruleSchema | 6-level confidence scale mapped to HIGH/MEDIUM/LOW enum | WIRED | Pattern `well-supported.*HIGH\|plausible.*MEDIUM\|speculative.*LOW` confirmed at lines 37-40 |
| `rules-tools-prompt.ts` | `02-initial-hypothesizer-instructions.ts` | `{{RULES_TOOLS_INSTRUCTIONS}}` template injection | WIRED | Template slot confirmed at line 13 of hypothesizer |
| `rules-tools-prompt.ts` | `02-synthesizer-instructions.ts` | `{{RULES_TOOLS_INSTRUCTIONS}}` template injection | WIRED | Template slot confirmed at line 13 of synthesizer |
| `04-question-answerer-instructions.ts` | `workflow-schemas.ts` questionAnswerSchema | 6-level confidence scale mapped to HIGH/MEDIUM/LOW enum | WIRED | Pattern `well-supported.*HIGH\|plausible.*MEDIUM` confirmed at lines 21-23 |
| `npm run eval -- --comparison` | All 12 rewritten instruction files | Workflow execution using rewritten prompts | NOT_WIRED | Eval not run; no `evals/results/` directory |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PE-01 | Plan 03 | Eval baseline captured before prompt changes | SKIPPED | User decision — no baseline captured before prompt changes. Documented in 30-03-SUMMARY.md. |
| PE-02 | Plan 01 | GPT-5-mini agent prompts rewritten per OpenAI GPT-5 prompting guide | SATISFIED | All 5 GPT-5-mini files verified with XML sections, schema-first ordering, grounding principles. REQUIREMENTS.md status: Complete. |
| PE-03 | Plan 02 | Gemini 3 Flash agent prompts rewritten per Google Gemini 3 prompting guide | SATISFIED | All 7 Gemini files verified with XML sections, no chain-of-thought scaffolding. REQUIREMENTS.md status: Complete. |
| PE-05 | Plans 01, 02 | Confidence/conclusion vocabulary standardized across all 19 agent prompts | SATISFIED | 6-level evidence-based scale confirmed in rules-tools-prompt.ts (injected into hypothesizer and synthesizer), directly in rules-improver, question-answerer, rules-improvement-extractor. REQUIREMENTS.md status: Complete. |
| PE-06 | Plan 03 | Each prompt rewrite verified with eval run (no regression from baseline) | DEFERRED | Eval run has not been executed. No results directory. REQUIREMENTS.md status: Pending. |
| PE-07 | Plan 03 | At least one --mode production eval run per model family | SKIPPED | User decision — testing mode only. Documented in 30-03-SUMMARY.md. |

**Orphaned requirements check:** PE-04 is mapped to Phase 31, not Phase 30 — not orphaned. No phase 30 requirements are unaccounted for.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | No TODO/FIXME/placeholder patterns detected in any of the 13 instruction files |

### Human Verification Required

#### 1. Eval Run with Comparison

**Test:** Run `npm run eval -- --comparison` from the project root (requires `.env` with `OPENROUTER_API_KEY`).
**Expected:** Command completes without Zod validation errors. Results JSON written to `evals/results/`. Translation-accuracy scores are recorded per problem. Workflow scores are competitive with or better than zero-shot baseline (no catastrophic regression).
**Why human:** Eval makes live API calls to OpenRouter and incurs cost. It cannot be triggered programmatically in a verification pass. User must confirm acceptable eval performance to satisfy PE-06.

### Gaps Summary

Three truths from Plan 03 remain unverified because the eval run was deferred to the user. The plan's SUMMARY explicitly documents this decision — the user opted to run the eval manually. This is the single gap blocking full phase completion.

The 10 code-level truths across Plans 01 and 02 are fully verified:
- All 12 instruction files exist with substantive XML-structured content
- All export names preserved exactly
- No new TypeScript compilation errors introduced (the 3 errors in `skeleton.tsx` and `layout.tsx` pre-date phase 30 by multiple phases)
- All key links wired: confidence scales mapped, template slots preserved
- PE-02, PE-03, PE-05 satisfied per REQUIREMENTS.md

The gap is exclusively the eval verification step (PE-06). PE-01 and PE-07 are formally SKIPPED per user decision and are not gaps in the implementation — they are scope decisions.

To close the gap: run `npm run eval -- --comparison`, confirm results appear in `evals/results/`, and confirm no Zod validation errors or catastrophic score regression.

---

_Verified: 2026-03-09T09:00:00Z_
_Verifier: Claude (gsd-verifier)_
