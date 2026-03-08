# Requirements: LO-Solver v1.4 Claude Code Native Solver

**Defined:** 2026-03-07
**Core Value:** The agentic workflow must produce measurably better results than zero-shotting the same LLMs without orchestration.

## v1.4 Requirements

### Documentation

- [x] **DOCS-01**: Document the current Mastra workflow pipeline in detail (steps, agents, data flow, prompts, tools)
- [x] **DOCS-02**: Document each agent's role, inputs, outputs, and system prompt summary
- [x] **DOCS-03**: Document the verification loop mechanics (iteration flow, pass/fail logic, improvement strategy)
- [x] **DOCS-04**: Written as a reference markdown file in `claude-code/` for the new agents to reference

### Orchestration

- [x] **ORCH-01**: User can trigger solver via `/solve` slash command in Claude Code
- [x] **ORCH-02**: Orchestrator asks for problem input (paste text or provide file path)
- [ ] **ORCH-03**: Orchestrator dispatches subagents in pipeline order with file-based state
- [ ] **ORCH-04**: Each agent reads predecessor files and writes its own named output file
- [x] **ORCH-05**: Orchestrator selects best hypothesis by comparing test pass rates from files

### Extraction

- [x] **EXTR-01**: Extractor agent parses raw problem into structured JSON (context, dataset, questions)
- [x] **EXTR-02**: Structured output written to `workspace/extracted.json`

### Hypothesis

- [x] **HYPO-01**: Multiple hypothesizer agents dispatched in parallel, each with a different linguistic perspective
- [x] **HYPO-02**: Each hypothesizer writes rules + vocabulary to its own draft file (`workspace/hypothesis-{n}.json`)
- [x] **HYPO-03**: Best hypothesis selected by orchestrator based on test results

### Verification

- [ ] **VERI-01**: Verifier agent tests each rule and sentence against the dataset
- [x] **VERI-02**: Verifier writes test results to `workspace/verification-{iteration}.json`
- [x] **VERI-03**: Verify/improve loop runs up to 4 iterations

### Improvement

- [x] **IMPR-01**: Improver agent reads verification failures and revises rules
- [x] **IMPR-02**: Improved rules written to `workspace/improved-{iteration}.json`

### Answer

- [x] **ANSR-01**: Answerer agent applies validated rules to translate questions
- [x] **ANSR-02**: Final answers written to `workspace/answers.json`

### Output

- [x] **OUTP-01**: Results displayed in terminal (rules, vocabulary, answers)
- [x] **OUTP-02**: Full solution written to markdown file with all intermediate steps
- [x] **OUTP-03**: All intermediate JSON files preserved in workspace for debugging

### Infrastructure

- [x] **INFR-01**: `claude-code/` directory with `.claude/` containing all agent/skill definitions
- [ ] **INFR-02**: All agents use Opus 4.6
- [x] **INFR-03**: CLAUDE.md with project context and conventions

## Future Requirements

### Evaluation

- **EVAL-01**: Compare Claude Code solver output against Mastra solver on same problems
- **EVAL-02**: Integration with existing eval harness for automated scoring

### Optimization

- **OPT-01**: Prompt tuning based on eval results
- **OPT-02**: Context budget management for long problems

## Out of Scope

| Feature | Reason |
|---------|--------|
| Replacing the Mastra workflow | Parallel implementation, not a replacement |
| UI/frontend for Claude Code solver | Terminal-only output; existing Next.js UI stays with Mastra |
| Agent Teams (experimental) | Confirmed unstable, known limitations, not needed |
| Streaming/real-time events | Claude Code subagents don't support event streaming to parent |
| Custom tool definitions | Subagents use Claude Code's built-in tools (Read, Write, Bash, etc.) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DOCS-01 | Phase 19 | Complete |
| DOCS-02 | Phase 19 | Complete |
| DOCS-03 | Phase 19 | Complete |
| DOCS-04 | Phase 19 | Complete |
| INFR-01 | Phase 20 | Complete |
| INFR-02 | Phase 20, 26 | Pending |
| INFR-03 | Phase 20 | Complete |
| EXTR-01 | Phase 21 | Complete |
| EXTR-02 | Phase 21 | Complete |
| HYPO-01 | Phase 21 | Complete |
| HYPO-02 | Phase 21 | Complete |
| HYPO-03 | Phase 21 | Complete |
| ORCH-01 | Phase 22 | Complete |
| ORCH-02 | Phase 22 | Complete |
| ORCH-03 | Phase 22, 25 | Pending |
| ORCH-04 | Phase 22, 25 | Pending |
| ORCH-05 | Phase 22 | Complete |
| VERI-01 | Phase 23, 25 | Pending |
| VERI-02 | Phase 23 | Complete |
| VERI-03 | Phase 23 | Complete |
| IMPR-01 | Phase 23 | Complete |
| IMPR-02 | Phase 23 | Complete |
| ANSR-01 | Phase 23 | Complete |
| ANSR-02 | Phase 23 | Complete |
| OUTP-01 | Phase 24 | Complete |
| OUTP-02 | Phase 24 | Complete |
| OUTP-03 | Phase 24 | Complete |

**Coverage:**
- v1.4 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0
- Pending (gap closure): 4 (ORCH-03, ORCH-04, VERI-01, INFR-02)
- Complete: 23

---
*Requirements defined: 2026-03-07*
*Last updated: 2026-03-08 after gap closure phase assignments*
