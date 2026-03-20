# LO-Solver

An AI-powered Linguistics Olympiad solver built with [Mastra](https://mastra.ai/). This project uses agentic workflows to analyze and solve Rosetta Stone-style linguistics puzzles—the kind found in competitions like the International Linguistics Olympiad (IOL), UK Linguistics Olympiad (UKLO), and North American Computational Linguistics Olympiad (NACLO).

## Overview

Rosetta Stone problems present sentences in an unfamiliar language alongside their translations. Solvers must deduce the underlying grammatical rules and vocabulary to translate new sentences. This project automates that process using multi-agent AI workflows.

## How It Works

[TBC]

## Project Structure

[TBC]

## Getting Started

### Prerequisites

- Node.js ≥ 22.13.0
- An [OpenRouter](https://openrouter.ai/) API key

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Add your API keys to the `.env` file.

### Running

Start the Mastra development server:

```bash
npm run dev
```

To start fresh (clears the database):

```bash
npm run dev:new
```

## Example Problems

The `examples/` directory contains sample problems from linguistics olympiads:

- **Forest Enets** (IOL 2024) – Uralic language from Northern Siberia
- **Okinawan** (IOL 2024) – Japonic language from Japan
- **Saisiyat** (UKLO 2025) – Austronesian language from Taiwan

## Evaluation

Run the eval suite against ground-truth linguistics problems to measure solver accuracy.

```bash
npm run eval
```

### Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--provider <openrouter\|claude-code>` | LLM provider | `openrouter` |
| `--mode <testing\|production>` | Model tier | `testing` |
| `--concurrency <N>` | Run N problems in parallel | `1` |
| `--problem <id>` | Run a single problem by ID (e.g. `forest-enets`) | all problems |
| `--comparison` | Also run zero-shot baseline and show delta | off |
| `--rounds <N>` | Max verify/improve iterations (1–5) | `3` |
| `--perspectives <N>` | Number of hypothesis perspectives (2–7) | `3` |

### Examples

```bash
# Single problem with Claude Code production models
npm run eval -- --problem forest-enets --provider claude-code --mode production

# Full suite with zero-shot comparison
npm run eval -- --comparison

# Parallel execution with more iterations
npm run eval -- --concurrency 3 --rounds 4 --perspectives 5
```

Results are saved as JSON in `evals/results/`. Workflow execution logs are written to `logs/`.

## Technologies

- **[Mastra](https://mastra.ai/)** – AI agent orchestration framework
- **TypeScript** – Type-safe development
- **Zod** – Schema validation
- **OpenRouter** – LLM provider abstraction

## License

This project is for educational and research purposes.
