---
name: solve
description: Solve a Linguistics Olympiad Rosetta Stone problem
disable-model-invocation: true
argument-hint: "[file-path]"
---

## Step 1: Get Problem Input

If `$ARGUMENTS` is not empty:
1. Check if it looks like a file path (starts with `/` or `./`, or ends with `.md` or `.txt`)
2. If it is a file path, read that file using the Read tool to get the raw problem text
3. If it does not look like a file path, treat `$ARGUMENTS` as inline problem text

If `$ARGUMENTS` is empty:
1. Ask the user: "Please paste your Linguistics Olympiad problem text, or provide a file path (e.g., `/solve examples/problem.md`)."
2. Wait for the user's response
3. If the response looks like a file path (starts with `/` or `./`, or ends with `.md` or `.txt`), read that file
4. Otherwise, treat the response as inline problem text

Store the resulting text as the raw problem text for subsequent steps.

## Step 2: Create Workspace

1. Generate a timestamp by running `date +"%Y-%m-%d_%H-%M-%S"` via Bash
2. Set the workspace path: `WORKSPACE="claude-code/workspace/{timestamp}"`
3. Create the directory structure:
   ```bash
   mkdir -p "$WORKSPACE/hypotheses/round-1"
   ```
4. Write the raw problem text to `$WORKSPACE/problem-raw.md` using the Write tool

## Step 3: Extract Problem Structure

Print: `"Extracting problem structure..."`

Use the **extractor** agent:
- Read the raw problem from: `{WORKSPACE}/problem-raw.md`
- Write the extracted problem to: `{WORKSPACE}/problem.md`

After the extractor completes:
- Check that `{WORKSPACE}/problem.md` exists using the Bash tool (`test -f`)
- If it does not exist, print: `"Extraction failed -- no problem.md produced. Aborting."` and stop

## Step 4: Multi-Perspective Hypothesis Loop

This loop runs up to 3 rounds. For each round N (starting at 1):

### Step 4a: Generate Perspectives

**Round 1:**

Print: `"Round 1: Generating 3 perspectives..."`

Read `{WORKSPACE}/problem.md` and generate 3 diverse linguistic perspectives. For each perspective, create:
- A **name** (e.g., "Morphological Analysis", "Syntactic Patterns", "Agreement Systems")
- A **description** of 2-3 sentences explaining what linguistic angle to explore

Choose from angles such as: morphological analysis (affixes, roots, agglutination), syntactic analysis (word order, modifier placement), phonological analysis (sound changes, vowel harmony), agreement/concord patterns (person, number, gender, case), semantic/pragmatic features (tense, aspect, evidentiality), orthographic patterns (special characters, spelling rules). Ensure all 3 perspectives are genuinely different angles.

**Round 2+:**

Print: `"Round {N}: Analyzing gaps and generating targeted perspectives..."`

Read `{WORKSPACE}/verification.md` from the previous round. Identify which rules failed and which sentences had errors. Generate 2-3 targeted perspectives that address the specific failures and gaps. Create the round directory:
```bash
mkdir -p "$WORKSPACE/hypotheses/round-{N}"
```

### Step 4b: Dispatch Hypothesizers

For each perspective P (1 to the number of perspectives), **sequentially**:

Print: `"Generating perspective {P} of {count}: {perspective_name}..."`

Use the **hypothesizer** agent:
- Read the problem from: `{WORKSPACE}/problem.md`
- Assigned perspective: `{name} -- {description}`
- Round: `{N}`, Perspective: `{P}`
- Write output to: `{WORKSPACE}/hypotheses/round-{N}/perspective-{P}.md`
- For Round 2+, also include: `Read baseline rules and vocabulary from: {WORKSPACE}/solution.md`

After the hypothesizer completes:
- Check that `{WORKSPACE}/hypotheses/round-{N}/perspective-{P}.md` exists
- If it does not exist on first attempt: retry once with the same instructions
- If retry also fails: print `"Perspective {P} failed -- continuing with remaining perspectives"` and append the error to `{WORKSPACE}/errors.md`

### Step 4c: Verify Perspectives

For each perspective P that produced an output file, **sequentially**:

Print: `"Verifying perspective {P}: {perspective_name}..."`

This is the multi-call verification orchestration. The /solve skill itself orchestrates individual verifier calls and aggregates results.

**Step 4c.1: Extract rules and sentences from perspective and problem**

Read `{WORKSPACE}/hypotheses/round-{N}/perspective-{P}.md` to get the list of rule titles (each `### {title}` under `## Rules`).
Read `{WORKSPACE}/problem.md` to get dataset sentences and questions.

**Step 4c.2: Test rules (one per call)**

For each rule title in the perspective:
1. Use the **verifier** agent in rule test mode:
   - Test type: "rule"
   - Rule title: {rule_title}
   - Solution file: {WORKSPACE}/hypotheses/round-{N}/perspective-{P}.md
   - Problem file: {WORKSPACE}/problem.md
   - Output file: a temporary result (read back immediately)
2. Read the verifier's output to get the Status (PASS/FAIL/NEEDS_UPDATE)
3. Record the result: rule title, status, reasoning

**Step 4c.3: Test sentences (one per call, blind translation)**

For each dataset sentence (from the `## Dataset` table in problem.md):
1. Use the **verifier** agent in sentence test mode:
   - Test type: "sentence"
   - Sentence: the foreign text to translate
   - Direction: the translation direction (based on which column is source vs target)
   - Solution file: {WORKSPACE}/hypotheses/round-{N}/perspective-{P}.md
   - Problem file: {WORKSPACE}/problem.md
   - Output file: a temporary result
2. Read the verifier's output to get the blind Translation
3. Normalize both the verifier's translation and the expected translation:
   - Trim whitespace
   - Convert to lowercase
   - Remove leading/trailing punctuation
4. Compare: PASS if normalized strings match, FAIL otherwise
5. Record: sentence number, expected, got, PASS/FAIL

For each question in problem.md (from `## Questions`):
1. Use the **verifier** agent in sentence test mode (same as above but no expected answer)
2. Read the verifier's blind translation
3. Record: question ID, translation (for coverage logging only -- questions do not count toward pass rate)

**Step 4c.4: Aggregate and write verification file**

Compute:
- rules_passed = count of rules with PASS status
- rules_failed = count of rules with FAIL or NEEDS_UPDATE status
- sentences_passed = count of dataset sentences with PASS status
- sentences_failed = count of dataset sentences with FAIL status
- pass_rate = round(100 * (rules_passed + sentences_passed) / (rules_total + sentences_total))

Note: questions are NOT included in the pass rate denominator (they have no expected answer).

Write `{WORKSPACE}/hypotheses/round-{N}/verification-{P}.md` with this structure:

```
# Verification: Perspective {P}

## Summary

- Rules tested: {rules_total}
- Rules passed: {rules_passed}
- Rules failed: {rules_failed}
- Sentences tested: {sentences_total}
- Sentences passed: {sentences_passed}
- Sentences failed: {sentences_failed}
- Pass rate: {pass_rate}%

## Rule Results

### {Rule title}
**Status:** {PASS|FAIL|NEEDS_UPDATE}
**Notes:** {reasoning from verifier}

(repeat for each rule)

## Sentence Results

| # | {Foreign} | Expected {Target} | Generated {Target} | Status | Notes |
|---|-----------|-------------------|---------------------|--------|-------|
(one row per dataset sentence)

## Question Coverage

| # | Direction | Translation | Notes |
|---|-----------|-------------|-------|
(one row per question -- for logging, not pass rate)
```

If the verification file could not be written (e.g., all verifier calls failed): print `"Verification of perspective {P} failed -- continuing"` and append the error to `{WORKSPACE}/errors.md`

### Step 4d: Read Pass Rates and Print Summary

For each perspective that has a verification file:
- Read the `## Summary` section of `{WORKSPACE}/hypotheses/round-{N}/verification-{P}.md`
- Extract the `Pass rate: {N}%` value

Print: `"Round {N} results: {name1} {rate1}%, {name2} {rate2}%, {name3} {rate3}%"`

If no perspectives produced valid verification results, print an error and abort.

### Step 4e: Dispatch Synthesizer

Print: `"Synthesizing best rules from all perspectives..."`

Use the **synthesizer** agent:
- Read all perspective files from this round: `{WORKSPACE}/hypotheses/round-{N}/perspective-*.md`
- Read all verification files from this round: `{WORKSPACE}/hypotheses/round-{N}/verification-*.md`
- Read the problem from: `{WORKSPACE}/problem.md`
- For Round 2+: read the previous solution from `{WORKSPACE}/solution.md`
- Write the merged solution to: `{WORKSPACE}/solution.md`

After the synthesizer completes:
- Check that `{WORKSPACE}/solution.md` exists
- If it does not exist: use the perspective file with the highest pass rate as a fallback -- copy it to `{WORKSPACE}/solution.md`

### Step 4f: Convergence Check

Print: `"Checking convergence..."`

This is the multi-call verification orchestration for the merged solution. The /solve skill itself orchestrates individual verifier calls and aggregates results.

**Step 4f.1: Extract rules and sentences from solution and problem**

Read `{WORKSPACE}/solution.md` to get the list of rule titles (each `### {title}` under `## Rules`).
Read `{WORKSPACE}/problem.md` to get dataset sentences and questions.

**Step 4f.2: Test rules (one per call)**

For each rule title in the solution:
1. Use the **verifier** agent in rule test mode:
   - Test type: "rule"
   - Rule title: {rule_title}
   - Solution file: {WORKSPACE}/solution.md
   - Problem file: {WORKSPACE}/problem.md
   - Output file: a temporary result (read back immediately)
2. Read the verifier's output to get the Status (PASS/FAIL/NEEDS_UPDATE)
3. Record the result: rule title, status, reasoning

**Step 4f.3: Test sentences (one per call, blind translation)**

For each dataset sentence (from the `## Dataset` table in problem.md):
1. Use the **verifier** agent in sentence test mode:
   - Test type: "sentence"
   - Sentence: the foreign text to translate
   - Direction: the translation direction (based on which column is source vs target)
   - Solution file: {WORKSPACE}/solution.md
   - Problem file: {WORKSPACE}/problem.md
   - Output file: a temporary result
2. Read the verifier's output to get the blind Translation
3. Normalize both the verifier's translation and the expected translation:
   - Trim whitespace
   - Convert to lowercase
   - Remove leading/trailing punctuation
4. Compare: PASS if normalized strings match, FAIL otherwise
5. Record: sentence number, expected, got, PASS/FAIL

For each question in problem.md (from `## Questions`):
1. Use the **verifier** agent in sentence test mode (same as above but no expected answer)
2. Read the verifier's blind translation
3. Record: question ID, translation (for coverage logging only -- questions do not count toward pass rate)

**Step 4f.4: Aggregate and write verification file**

Compute:
- rules_passed = count of rules with PASS status
- rules_failed = count of rules with FAIL or NEEDS_UPDATE status
- sentences_passed = count of dataset sentences with PASS status
- sentences_failed = count of dataset sentences with FAIL status
- pass_rate = round(100 * (rules_passed + sentences_passed) / (rules_total + sentences_total))

Note: questions are NOT included in the pass rate denominator (they have no expected answer).

Write `{WORKSPACE}/verification.md` with this structure:

```
# Final Verification

## Summary

- Rules tested: {rules_total}
- Rules passed: {rules_passed}
- Rules failed: {rules_failed}
- Sentences tested: {sentences_total}
- Sentences passed: {sentences_passed}
- Sentences failed: {sentences_failed}
- Pass rate: {pass_rate}%

## Rule Results

### {Rule title}
**Status:** {PASS|FAIL|NEEDS_UPDATE}
**Notes:** {reasoning from verifier}

(repeat for each rule)

## Sentence Results

| # | {Foreign} | Expected {Target} | Generated {Target} | Status | Notes |
|---|-----------|-------------------|---------------------|--------|-------|
(one row per dataset sentence)

## Question Coverage

| # | Direction | Translation | Notes |
|---|-----------|-------------|-------|
(one row per question -- for logging, not pass rate)
```

After writing verification.md, read the `## Summary` section and check the pass rate:

- If pass rate is **100%** (all rules pass, all sentences pass):
  - Print: `"Converged! All rules pass verification."`
  - Break out of the loop

- If **not converged** and round < 3:
  - Print: `"Round {N} pass rate: {rate}%. Starting round {N+1}..."`
  - Continue to the next round

- If **not converged** and round = 3:
  - Print: `"Maximum rounds reached. Using best result (pass rate: {rate}%)."`
  - Break out of the loop

## Step 5: Verify-Improve Loop and Answer

### Step 5a: Check Iteration 0 (Convergence from Step 4f)

Read `{WORKSPACE}/verification.md` (produced by Step 4f).
Extract the pass rate from the `## Summary` section.

If pass rate is **100%**:
- Print: `"Step 4f already converged at 100%. Skipping to answer step."`
- Set CURRENT_SOLUTION to `{WORKSPACE}/solution.md`
- Jump to Step 5d (Answer)

Otherwise:
- Print: `"Starting verify-improve loop (iteration 0 pass rate: {rate}%)..."`
- Set CURRENT_SOLUTION to `{WORKSPACE}/solution.md`
- Set CURRENT_VERIFICATION to `{WORKSPACE}/verification.md`
- Continue to Step 5b

### Steps 5b-5c: Verify-Improve Loop (iterations 1 to 4)

For iteration I (1 to 4):

#### Step 5b: Improve (iteration I)

Print: `"Iteration {I}: Improving rules..."`

Use the **improver** agent:
- Read current solution from: {CURRENT_SOLUTION}
- Read verification from: {CURRENT_VERIFICATION}
- Read problem from: {WORKSPACE}/problem.md
- Write improved rules to: {WORKSPACE}/improved-{I}.md

After the improver completes:
- Check that `{WORKSPACE}/improved-{I}.md` exists using `test -f`
- If it does not exist on first attempt: retry once with the same instructions
- If retry also fails: print `"Improvement failed at iteration {I}. Using last known good solution."` and append to `{WORKSPACE}/errors.md`, then break out of the loop

Set CURRENT_SOLUTION to `{WORKSPACE}/improved-{I}.md`

#### Step 5c: Verify (iteration I)

Print: `"Iteration {I}: Verifying rules..."`

This is the multi-call verification orchestration. The /solve skill itself orchestrates individual verifier calls and aggregates results.

**Step 5c.1: Extract rules and sentences from current solution and problem**

Read {CURRENT_SOLUTION} to get the list of rule titles (each `### {title}` under `## Rules`).
Read `{WORKSPACE}/problem.md` to get dataset sentences and questions.

**Step 5c.2: Test rules (one per call)**

For each rule title in the solution:
1. Use the **verifier** agent in rule test mode:
   - Test type: "rule"
   - Rule title: {rule_title}
   - Solution file: {CURRENT_SOLUTION}
   - Problem file: {WORKSPACE}/problem.md
   - Output file: a temporary result (the /solve skill reads it back immediately)
2. Read the verifier's output to get the Status (PASS/FAIL/NEEDS_UPDATE)
3. Record the result: rule title, status, reasoning

**Step 5c.3: Test sentences (one per call, blind translation)**

For each dataset sentence (from the `## Dataset` table in problem.md):
1. Use the **verifier** agent in sentence test mode:
   - Test type: "sentence"
   - Sentence: the foreign text to translate
   - Direction: the translation direction (based on which column is source vs target)
   - Solution file: {CURRENT_SOLUTION}
   - Problem file: {WORKSPACE}/problem.md
   - Output file: a temporary result
2. Read the verifier's output to get the blind Translation
3. Normalize both the verifier's translation and the expected translation:
   - Trim whitespace
   - Convert to lowercase
   - Remove leading/trailing punctuation
4. Compare: PASS if normalized strings match, FAIL otherwise
5. Record: sentence number, expected, got, PASS/FAIL

For each question in problem.md (from `## Questions`):
1. Use the **verifier** agent in sentence test mode (same as above but no expected answer)
2. Read the verifier's blind translation
3. Record: question ID, translation (for coverage logging only -- questions do not count toward pass rate)

**Step 5c.4: Aggregate and write verification file**

Compute:
- rules_passed = count of rules with PASS status
- rules_failed = count of rules with FAIL or NEEDS_UPDATE status
- sentences_passed = count of dataset sentences with PASS status
- sentences_failed = count of dataset sentences with FAIL status
- pass_rate = round(100 * (rules_passed + sentences_passed) / (rules_total + sentences_total))

Note: questions are NOT included in the pass rate denominator (they have no expected answer).

Write `{WORKSPACE}/verification-{I}.md` with this structure:

```
# Verification: Iteration {I}

## Summary

- Rules tested: {rules_total}
- Rules passed: {rules_passed}
- Rules failed: {rules_failed}
- Sentences tested: {sentences_total}
- Sentences passed: {sentences_passed}
- Sentences failed: {sentences_failed}
- Pass rate: {pass_rate}%

## Rule Results

### {Rule title}
**Status:** {PASS|FAIL|NEEDS_UPDATE}
**Notes:** {reasoning from verifier}

(repeat for each rule)

## Sentence Results

| # | {Foreign} | Expected {Target} | Generated {Target} | Status | Notes |
|---|-----------|-------------------|---------------------|--------|-------|
(one row per dataset sentence)

## Question Coverage

| # | Direction | Translation | Notes |
|---|-----------|-------------|-------|
(one row per question -- for logging, not pass rate)
```

Set CURRENT_VERIFICATION to `{WORKSPACE}/verification-{I}.md`

#### Convergence check and iteration summary

Print: `"Iteration {I}: {pass_rate}% ({rules_passed}/{rules_total} rules, {sentences_passed}/{sentences_total} sentences)"`

If pass_rate is 100%:
- Print: `"Converged at iteration {I}! All rules and sentences pass."`
- Break out of the loop

If I = 4 (max iterations reached):
- Print: `"Maximum iterations reached. Final pass rate: {pass_rate}%."`
- If any rules failed, print: `"Failing rules: {comma-separated failing rule titles}"`
- If any sentences failed, print: `"Failing sentences: {comma-separated failing sentence numbers}"`
- Break out of the loop

Otherwise:
- Continue to iteration I+1

### Step 5d: Answer

Print: `"Generating answers from validated rules..."`

Use the **answerer** agent:
- Read solution from: {CURRENT_SOLUTION}
- Read problem from: {WORKSPACE}/problem.md
- Write answers to: {WORKSPACE}/answers.md

After the answerer completes:
- Check that `{WORKSPACE}/answers.md` exists using `test -f`
- If it does not exist on first attempt: retry once
- If retry also fails: print `"Answer generation failed."` and append to `{WORKSPACE}/errors.md`

## Step 6: Output Results

### Step 6a: Display Results in Terminal

Read {CURRENT_SOLUTION} to extract the rules (from `## Rules` section) and vocabulary (from `## Vocabulary` section).
Read `{WORKSPACE}/answers.md` to extract translated answers (from each `## Q{N}` section).
Read {CURRENT_VERIFICATION} to get the overall pass rate (from `## Summary`) and per-rule results (from `## Rule Results`).

If CURRENT_VERIFICATION is not set (100% convergence at Step 4f with no verify-improve loop), use `{WORKSPACE}/verification.md`.

Print: `""`
Print: `"--- Results ---"`
Print: `""`

Print: `"Rules:"`

For each rule (`### {title}` under `## Rules` in CURRENT_SOLUTION):
  - Extract the rule title and the first sentence of its description as a one-liner
  - Look up this rule's status in CURRENT_VERIFICATION's `## Rule Results` section
  - Print: `"{N}. {title} -- {one-line description}"`
  - If the rule's status is FAIL or NEEDS_UPDATE:
    - Extract the verifier's reasoning from the Rule Results Notes field
    - Print: `"   [FAIL] {reasoning}"`

Print: `""`
Print: `"Answers:"`

If `{WORKSPACE}/answers.md` exists (check with `test -f`):
  For each question section (`## Q{N}` in answers.md):
    - Extract the input sentence (from `**Input:**` line) and translation (from `**Translation:**` or `**Revised translation:**` line, preferring revised if present)
    - Print: `"{Q_ID}: {input} -> {translation}"`
If `{WORKSPACE}/answers.md` does not exist:
  Print: `"No answers generated -- see errors.md for details."`

Print: `""`

Extract the pass rate from CURRENT_VERIFICATION's `## Summary` section.
Print: `"Pass rate: {rate}%"`

If `{WORKSPACE}/errors.md` exists (check with `test -f`):
  Read it and check for errors that affected the outcome -- look for entries where Recovered is "No" or entries that mention fallback/degraded behavior.
  If any such errors exist:
    Print: `""`
    Print: `"Warnings:"`
    For each relevant error:
      Print: `"- {agent}: {message}"`

### Step 6b: Write Solution File

Read {CURRENT_SOLUTION} for the full rules and vocabulary sections.
Read {CURRENT_VERIFICATION} for per-rule verification status and reasoning.
Read `{WORKSPACE}/answers.md` for translated answers (if it exists).
If `{WORKSPACE}/errors.md` exists (check with `test -f`), read it for pipeline notes.

If CURRENT_VERIFICATION is not set (100% convergence at Step 4f with no verify-improve loop), use `{WORKSPACE}/verification.md`.

Collect verification history:
  Read `{WORKSPACE}/verification.md` and extract the pass rate from `## Summary` (this is iteration 0).
  For I = 1 to 4:
    Check if `{WORKSPACE}/verification-{I}.md` exists (using `test -f` via Bash).
    If it exists, read it and extract the pass rate from `## Summary`.

Write `{WORKSPACE}/solution-complete.md` using the Write tool with the structure defined in `references/workspace-format.md` (## solution-complete.md template).

Key formatting rules for the solution file:
- Problem reference: `> Problem: See problem.md` (do not include problem content inline)
- Rules section: include full description, evidence, confidence, verification status (PASS/FAIL), and for failed rules include the verifier's failure reasoning
- Vocabulary section: table with Form, Meaning, Type, Notes columns (Source column from CURRENT_SOLUTION can be omitted)
- Verification Summary: one line per iteration that actually occurred (check file existence before including), format: `- Iteration {N}: {rate}%` with iteration 0 labeled `- Iteration 0 (initial): {rate}%`
- Answers section: one subsection per question with Input, Translation, and Confidence. If answers.md does not exist, note the failure in this section instead.
- Pipeline Notes section: include ONLY if errors.md exists and contains entries. List each error with agent name, message, and recovery status. Omit this section entirely on clean runs.

Do NOT include:
- Hypothesis round details (per-perspective results, individual round data)
- Full verification tables (the summary lines per iteration cover the history)
- The problem dataset or context (referenced via "See problem.md")
