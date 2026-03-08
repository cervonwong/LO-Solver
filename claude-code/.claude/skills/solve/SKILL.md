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

### Step 4c: Dispatch Verifiers

For each perspective P that produced an output file, **sequentially**:

Print: `"Verifying perspective {P}: {perspective_name}..."`

Use the **verifier** agent:
- Read the hypothesis from: `{WORKSPACE}/hypotheses/round-{N}/perspective-{P}.md`
- Read the problem from: `{WORKSPACE}/problem.md`
- Write verification results to: `{WORKSPACE}/hypotheses/round-{N}/verification-{P}.md`

After the verifier completes:
- Check that the verification file exists
- If it does not exist: print `"Verification of perspective {P} failed -- continuing"` and append the error to `{WORKSPACE}/errors.md`

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

Use the **verifier** agent:
- Read the hypothesis from: `{WORKSPACE}/solution.md`
- Read the problem from: `{WORKSPACE}/problem.md`
- Write verification results to: `{WORKSPACE}/verification.md`

After the verifier completes, read `{WORKSPACE}/verification.md` and check the `## Summary` section:

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

[Phase 23 -- verify-improve iteration loop on the synthesized solution, then answer step]

Print: `"Pipeline complete through synthesis. Verify-improve loop and answer step will be added in Phase 23."`
Print: `"Workspace: {WORKSPACE}/"`
