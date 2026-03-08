# Workspace File Format Templates

This document defines the expected markdown format for each file type in the workspace directory. Agents read this reference to understand what to produce and what to expect from predecessor files.

All examples use a fictional language called "Taloki" for illustration.

---

## problem.md

Produced by the extractor agent. Contains the parsed problem structure.

```markdown
# Problem

## Context

Language: Taloki
Language family: Austronesian (hypothesized)
Notes: Taloki uses a verb-initial word order (VSO). Suffixes mark tense and agreement. The letter "q" represents a glottal stop.

## Dataset

| # | Taloki | English |
|---|--------|---------|
| 1 | Kala-ti na boro | I ate the fish |
| 2 | Mira-su ko boro | You will see the fish |
| 3 | Kala-ti ko siga | You ate the bird |
| 4 | Vene-ra na siga | I caught the bird |
| 5 | Mira-su la boro | He/she will see the fish |
| 6 | Kala-ra ko siga | You caught the bird |

## Questions

| # | Direction | Sentence |
|---|-----------|----------|
| Q1 | Taloki -> English | Vene-ti la boro |
| Q2 | English -> Taloki | You will eat the bird |
| Q3 | Taloki -> English | Mira-ra na siga |
```

---

## perspective-N.md (hypothesis file)

Produced by the hypothesizer agent. Contains vocabulary and rules discovered from a specific linguistic perspective.

```markdown
# Perspective 1: Morphological Analysis

## Vocabulary

| Foreign Form | Meaning | Type | Notes |
|-------------|---------|------|-------|
| kala | eat | verb-root | Appears in #1, #3 |
| mira | see | verb-root | Appears in #2, #5 |
| vene | catch | verb-root | Appears in #4 |
| boro | fish | noun | Appears in #1, #2, #5 |
| siga | bird | noun | Appears in #3, #4, #6 |
| na | I/me | pronoun | First person; appears in #1, #4 |
| ko | you | pronoun | Second person; appears in #2, #3, #6 |
| la | he/she | pronoun | Third person; appears in #5 |

## Rules

### 1. Verb-initial word order (VSO)

Taloki sentences follow Verb-Subject-Object order. The verb comes first, followed by the subject pronoun, then the object noun.

**Evidence:** All dataset sentences (#1-#6) place the verb form before the pronoun and noun.

**Confidence:** HIGH

### 2. Tense suffixes on verbs

Verbs take a suffix to mark tense:
- `-ti` marks past tense ("ate", "caught")
- `-su` marks future tense ("will see", "will eat")
- `-ra` marks a distinct past action (possibly perfective: "caught" as completed)

**Evidence:**
- Past: `kala-ti` = "ate" (#1, #3), `vene-ti` = "caught" (hypothesized)
- Future: `mira-su` = "will see" (#2, #5)
- Perfective: `vene-ra` = "caught" (#4), `kala-ra` = "caught" (#6)

**Confidence:** MEDIUM -- the distinction between `-ti` and `-ra` needs further analysis.

### 3. Subject pronoun agreement

The subject pronoun appears after the verb and before the object. Pronoun choice is independent of the verb form (no verb-subject agreement marking beyond the pronoun itself).

**Evidence:** `na` consistently marks first person (#1, #4), `ko` second person (#2, #3, #6), `la` third person (#5).

**Confidence:** HIGH
```

---

## verification-N.md

Produced by the verifier agent. Contains test results for a specific perspective's rules.

```markdown
# Verification: Perspective 1

## Summary

- Rules tested: 3
- Rules passed: 2
- Rules failed: 1
- Sentences tested: 6
- Sentences passed: 5
- Sentences failed: 1
- Pass rate: 78%

## Rule Results

### Rule 1: Verb-initial word order (VSO)
**Status:** PASS
**Notes:** All 6 sentences confirm VSO order. No counterexamples found.

### Rule 2: Tense suffixes on verbs
**Status:** FAIL
**Notes:** The distinction between `-ti` and `-ra` is not accurately captured. In #4, `vene-ra` is translated as "caught" (past), and in #6 `kala-ra` is also "caught". But #1 uses `kala-ti` for "ate" (also past). The rule needs to clarify when `-ti` vs `-ra` applies -- they may mark different aspects rather than different tenses.

### Rule 3: Subject pronoun agreement
**Status:** PASS
**Notes:** Pronoun-person mapping is consistent across all examples.

## Sentence Results

| # | Taloki | Expected English | Generated English | Status | Notes |
|---|--------|-----------------|-------------------|--------|-------|
| 1 | Kala-ti na boro | I ate the fish | I ate the fish | PASS | |
| 2 | Mira-su ko boro | You will see the fish | You will see the fish | PASS | |
| 3 | Kala-ti ko siga | You ate the bird | You ate the bird | PASS | |
| 4 | Vene-ra na siga | I caught the bird | I caught the bird | PASS | |
| 5 | Mira-su la boro | He/she will see the fish | He/she will see the fish | PASS | |
| 6 | Kala-ra ko siga | You caught the bird | You ate the bird | FAIL | Rule 2 maps `-ra` to perfective "caught" but the rule as written is ambiguous about which English verb to use |

## Recommendations

1. Clarify the semantic distinction between `-ti` and `-ra` suffixes
2. Investigate whether `-ra` changes the verb meaning or only the aspect
```

---

## solution.md

Produced by the synthesizer agent. Contains the merged vocabulary and consolidated rules from the best-performing perspectives.

```markdown
# Solution

## Vocabulary

| Foreign Form | Meaning | Type | Notes | Source |
|-------------|---------|------|-------|--------|
| kala | eat | verb-root | #1, #3 | Perspective 1, 2 |
| mira | see | verb-root | #2, #5 | Perspective 1 |
| vene | catch | verb-root | #4 | Perspective 1, 3 |
| boro | fish | noun | #1, #2, #5 | Perspective 1, 2 |
| siga | bird | noun | #3, #4, #6 | Perspective 1 |
| na | I/me | pronoun | First person | Perspective 1, 2, 3 |
| ko | you | pronoun | Second person | Perspective 1, 2, 3 |
| la | he/she | pronoun | Third person | Perspective 1, 3 |

## Rules

### 1. Verb-initial word order (VSO)

Taloki sentences follow Verb-Subject-Object order: the inflected verb comes first, then the subject pronoun, then the object noun.

**Evidence:** All dataset sentences (#1-#6).
**Source:** Perspective 1 (pass rate 78%), confirmed by Perspective 2 (pass rate 85%).
**Confidence:** HIGH

### 2. Tense/aspect suffixes

Verbs take suffixes marking tense and aspect:
- `-ti` marks simple past ("ate", "saw")
- `-su` marks future ("will eat", "will see")
- `-ra` marks perfective past -- completed actions, often translated with a different English verb emphasizing completion ("caught" rather than generic past)

**Evidence:** `-ti` in #1, #3; `-su` in #2, #5; `-ra` in #4, #6.
**Source:** Perspective 1 (revised after verification), Perspective 3.
**Confidence:** MEDIUM

### 3. Subject pronouns

Subject pronouns appear between the verb and object:
- `na` = first person (I/me)
- `ko` = second person (you)
- `la` = third person (he/she)

**Evidence:** Consistent across all 6 sentences.
**Source:** Perspective 1, 2, 3 (unanimous).
**Confidence:** HIGH
```

---

## verification.md (final)

Produced by the verifier agent after testing the consolidated solution. Same structure as `verification-N.md` but applied to the merged ruleset.

```markdown
# Final Verification

## Summary

- Rules tested: 3
- Rules passed: 3
- Rules failed: 0
- Sentences tested: 6
- Sentences passed: 6
- Sentences failed: 0
- Pass rate: 100%

## Rule Results

### Rule 1: Verb-initial word order (VSO)
**Status:** PASS

### Rule 2: Tense/aspect suffixes
**Status:** PASS
**Notes:** Updated distinction between `-ti` (simple past) and `-ra` (perfective) resolves the earlier ambiguity.

### Rule 3: Subject pronouns
**Status:** PASS

## Sentence Results

| # | Taloki | Expected English | Generated English | Status | Notes |
|---|--------|-----------------|-------------------|--------|-------|
| 1 | Kala-ti na boro | I ate the fish | I ate the fish | PASS | |
| 2 | Mira-su ko boro | You will see the fish | You will see the fish | PASS | |
| 3 | Kala-ti ko siga | You ate the bird | You ate the bird | PASS | |
| 4 | Vene-ra na siga | I caught the bird | I caught the bird | PASS | |
| 5 | Mira-su la boro | He/she will see the fish | He/she will see the fish | PASS | |
| 6 | Kala-ra ko siga | You caught the bird | You caught the bird | PASS | |
```

---

## answers.md

Produced by the answerer agent. Contains translations for each question.

```markdown
# Answers

## Q1: Taloki -> English

**Input:** Vene-ti la boro
**Translation:** He/she ate the fish
**Confidence:** HIGH

**Working:**
- `vene` = catch (verb-root) -- but with `-ti` (simple past), translates as past tense
- Wait: `vene` = "catch", so `vene-ti` = "caught" (simple past) not "ate"
- `la` = he/she (third person pronoun)
- `boro` = fish (noun)
- VSO order: Verb-Subject-Object
- Result: "He/she caught the fish"

**Revised translation:** He/she caught the fish
**Rules applied:** Verb-initial word order, Tense/aspect suffixes, Subject pronouns

## Q2: English -> Taloki

**Input:** You will eat the bird
**Translation:** Kala-su ko siga
**Confidence:** HIGH

**Working:**
- "eat" = `kala` (verb-root)
- "will" = future tense = `-su` suffix
- "you" = `ko` (second person pronoun)
- "bird" = `siga` (noun)
- VSO order: Verb-Subject-Object
- Result: `kala-su ko siga`

**Rules applied:** Verb-initial word order, Tense/aspect suffixes, Subject pronouns

## Q3: Taloki -> English

**Input:** Mira-ra na siga
**Translation:** I spotted the bird
**Confidence:** MEDIUM

**Working:**
- `mira` = see (verb-root)
- `-ra` = perfective past (completed action)
- `na` = I/me (first person pronoun)
- `siga` = bird (noun)
- VSO order: Verb-Subject-Object
- Perfective of "see" could be "spotted", "observed", or "saw (completely)"
- Result: "I spotted the bird" (using perfective reading)

**Rules applied:** Verb-initial word order, Tense/aspect suffixes, Subject pronouns
**Notes:** The perfective of "see" is ambiguous in English; "spotted" chosen as closest perfective equivalent.
```

---

## errors.md

Created only when errors occur during a run. Contains timestamped error entries.

```markdown
# Error Log

## Entry 1

**Time:** 2026-03-07 14:32:15
**Agent:** hypothesizer (perspective-3)
**Error type:** Timeout
**Message:** Agent did not produce output within the time limit.
**Recovered:** Yes -- perspective-3 skipped, pipeline continued with perspectives 1 and 2.

## Entry 2

**Time:** 2026-03-07 14:35:42
**Agent:** verifier
**Error type:** Partial failure
**Message:** Sentence #8 could not be parsed -- contains an unknown diacritic not in the vocabulary.
**Recovered:** Yes -- sentence marked as FAIL with diagnostic note, verification continued.
```

---

## solution-complete.md

Produced by the /solve skill in Step 6. Consolidates rules, vocabulary, verification history, and answers into a single results document. References the problem file instead of including it inline.

```markdown
# Complete Solution

> Problem: See problem.md

## Rules

### 1. Verb-initial word order (VSO)

Taloki sentences follow Verb-Subject-Object order: the inflected verb comes first, then the subject pronoun, then the object noun.

**Evidence:** All dataset sentences (#1-#6) place the verb form before the pronoun and noun.
**Confidence:** HIGH
**Verification:** PASS

### 2. Tense/aspect suffixes

Verbs take suffixes marking tense and aspect:
- `-ti` marks simple past ("ate", "saw")
- `-su` marks future ("will eat", "will see")
- `-ra` marks perfective past -- completed actions ("caught" rather than generic past)

**Evidence:** `-ti` in #1, #3; `-su` in #2, #5; `-ra` in #4, #6.
**Confidence:** MEDIUM
**Verification:** FAIL
**Failure reason:** The distinction between `-ti` (simple past) and `-ra` (perfective) is not fully predictive -- sentence #6 `kala-ra ko siga` translates as "You caught the bird" but the rule does not explain why "catch" is used instead of "eat" when the root `kala` means "eat".

### 3. Subject pronouns

Subject pronouns appear between the verb and object:
- `na` = first person (I/me)
- `ko` = second person (you)
- `la` = third person (he/she)

**Evidence:** Consistent across all 6 sentences.
**Confidence:** HIGH
**Verification:** PASS

## Vocabulary

| Form | Meaning | Type | Notes |
|------|---------|------|-------|
| kala | eat | verb-root | #1, #3 |
| mira | see | verb-root | #2, #5 |
| vene | catch | verb-root | #4 |
| boro | fish | noun | #1, #2, #5 |
| siga | bird | noun | #3, #4, #6 |
| na | I/me | pronoun | First person |
| ko | you | pronoun | Second person |
| la | he/she | pronoun | Third person |

## Verification Summary

- Iteration 0 (initial): 78%
- Iteration 1: 89%
- Iteration 2: 100%
- Final: 100%

## Answers

### Q1: Taloki -> English

**Input:** Vene-ti la boro
**Translation:** He/she caught the fish
**Confidence:** HIGH

### Q2: English -> Taloki

**Input:** You will eat the bird
**Translation:** Kala-su ko siga
**Confidence:** HIGH

### Q3: Taloki -> English

**Input:** Mira-ra na siga
**Translation:** I spotted the bird
**Confidence:** MEDIUM

## Pipeline Notes

> This section is only included if errors occurred during the pipeline.

- hypothesizer (perspective-3): Agent did not produce output within the time limit. (Recovered: yes)
```
