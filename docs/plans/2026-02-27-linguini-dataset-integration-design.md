# Linguini Dataset Integration — Design

## Overview

Integrate the [Linguini](https://huggingface.co/datasets/facebook/linguini) benchmark dataset (IOL problems, 2003–2023) into LO-Solver as a sister dataset alongside the existing hand-curated examples. The 160 JSONL entries (73 unique questions) appear in the existing example picker, tagged with IOL source metadata.

## Attribution

The Linguini dataset is published under **CC-BY-4.0** by AI at Meta.

- **Paper:** Eduardo Sánchez, Belen Alastruey, Christophe Ropers, Pontus Stenetorp, Mikel Artetxe, Marta R. Costa-jussà. "Linguini: A benchmark for language-agnostic linguistic reasoning." [arXiv:2409.12126](https://arxiv.org/abs/2409.12126)
- **Dataset:** [facebook/linguini](https://huggingface.co/datasets/facebook/linguini)
- **License:** [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)

A `README.md` in `examples/linguini/` contains this attribution.

## Data Storage

```
examples/
  linguini/
    dataset_enriched.jsonl   # 160 entries with IOL metadata fields
    README.md                # Attribution, license, field descriptions
  index.ts                   # Extended to include Linguini entries
  *.md                       # Existing hand-curated examples (unchanged)
```

### Enriched JSONL Fields

Each entry in `dataset_enriched.jsonl` has the original Linguini fields plus:

| Field                  | Type   | Example                                     |
| ---------------------- | ------ | ------------------------------------------- |
| `iol_year`             | number | `2023`                                      |
| `iol_question_number`  | number | `1`                                         |
| `iol_question_title`   | string | `"Guazacapán Xinka"`                        |
| `iol_url`              | string | `"https://ioling.org/problems/2023/i1/"`    |
| `iol_location`         | string | `"Bansko"`                                  |

## Picker Integration

### Display format

Linguini problems appear in the existing example picker alongside UKLO/Onling entries:

- **IOL 2023 #1** — Guazacapán Xinka
- **IOL 2021 #2** — Zuni
- **UKLO** — Saisiyat (existing)
- **Onling.org** — Forest Enets (existing)

Tagged with source `IOL`, plus year and problem number.

### Grouping

The 160 JSONL entries are grouped into 73 questions by `(iol_year, iol_question_number)`. Each group becomes one selectable item in the picker. Sub-parts within a question share the same context but have different queries.

## Solver Input

When a Linguini problem is selected, structured data is passed directly to the solver workflow — `context` and `query` fields from the JSONL, not converted to markdown. The workflow handles the format difference from the existing markdown-based examples.

## What Does Not Change

- Existing UKLO and Onling.org examples continue to work as-is
- No changes to the solver workflow internals
- No changes to the data model for existing examples
