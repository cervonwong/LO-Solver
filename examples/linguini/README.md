# Linguini Dataset

IOL individual contest problems (2003–2023) from the Linguini benchmark, enriched with IOL metadata.

## Attribution

**Dataset:** [facebook/linguini](https://huggingface.co/datasets/facebook/linguini)
**Paper:** Eduardo Sánchez, Belen Alastruey, Christophe Ropers, Pontus Stenetorp, Mikel Artetxe, Marta R. Costa-jussà. "Linguini: A benchmark for language-agnostic linguistic reasoning." [arXiv:2409.12126](https://arxiv.org/abs/2409.12126)
**License:** [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)
**Organization:** AI at Meta

## Enrichment

Each JSONL entry has the original Linguini fields plus IOL metadata added by this project:

- `iol_year` — Competition year (e.g. 2023)
- `iol_question_number` — Individual problem number (1–5)
- `iol_question_title` — Problem title from IOL website (e.g. "Guazacapán Xinka")
- `iol_url` — Direct link to the problem on ioling.org
- `iol_location` — Host city of that year's IOL
