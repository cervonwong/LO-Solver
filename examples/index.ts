import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

export interface ExampleProblemMeta {
  id: string;
  language: string;
  source: string;
  year: number;
  questionNumber: number;
  inputFile: string;
  solutionFile: string;
  groundTruthFile?: string;
  sourceUrl: string;
  problemUrl: string;
  solutionUrl: string;
  notes?: string;
}

export const EXAMPLE_PROBLEMS: ExampleProblemMeta[] = [
  {
    id: 'saisiyat',
    language: 'Saisiyat',
    source: 'UKLO',
    year: 2025,
    questionNumber: 3,
    inputFile: 'uklo_2025R1P3_MoSy_Rosetta_Austr_Saisiyat_Input.md',
    solutionFile: 'uklo_2025R1P3_MoSy_Rosetta_Austr_Saisiyat_Solution.md',
    groundTruthFile: 'ground-truth/saisiyat.json',
    sourceUrl: 'https://uklo.org/',
    problemUrl: 'https://www.uklo.org/wp-content/uploads/2025/04/2025R1-3-Saisiyat.pdf',
    solutionUrl: 'https://www.uklo.org/wp-content/uploads/2025/04/2025R1-3-Saisiyat.pdf',
    notes:
      "Changed No. 13 input description from 'sends' to 'orders' to better reflect the intended meaning.",
  },
  {
    id: 'forest-enets',
    language: 'Forest Enets',
    source: 'Onling.org',
    year: 2024,
    questionNumber: 1,
    inputFile: 'onling_2024P1_MoSyPh_Rosetta_Uralic_Forest-Enets_Input.md',
    solutionFile: 'onling_2024P1_MoSyPh_Rosetta_Uralic_Forest-Enets_Solution.md',
    groundTruthFile: 'ground-truth/forest-enets.json',
    sourceUrl: 'https://onling.org/',
    problemUrl: 'https://onling.org/contests/student-2024/online/eng/',
    solutionUrl: 'https://onling.org/contests/student-2024/files/solutions.pdf',
  },
  {
    id: 'okinawan',
    language: 'Okinawan',
    source: 'Onling.org',
    year: 2024,
    questionNumber: 3,
    inputFile: 'onling_2024P3_MoSyPh_Rosetta_Japonic_Okinawan_Input.md',
    solutionFile: 'onling_2024P3_MoSyPh_Rosetta_Japonic_Okinawan_Solution.md',
    groundTruthFile: 'ground-truth/okinawan.json',
    sourceUrl: 'https://onling.org/',
    problemUrl: 'https://onling.org/contests/student-2024/online/eng/',
    solutionUrl: 'https://onling.org/contests/student-2024/files/solutions.pdf',
  },
];

/** Load ground truth answers for a hand-curated example problem. */
export function loadExampleGroundTruth(meta: ExampleProblemMeta): string[] {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const filePath = resolve(__dirname, meta.groundTruthFile!);
  const data = JSON.parse(readFileSync(filePath, 'utf-8'));
  return data.answers;
}

/** Read the input file content for a hand-curated example problem. */
export function readExampleInput(meta: ExampleProblemMeta): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const filePath = resolve(__dirname, meta.inputFile);
  return readFileSync(filePath, 'utf-8');
}

/** A single JSONL entry from the Linguini dataset. */
export interface LinguiniEntry {
  id: string;
  context: string;
  query: string;
  answer: string[] | string[][] | string;
  explanation: string;
  work_lang: string;
  task_lang: string[];
  task_type: string;
  eval_type: string;
  iol_year: number;
  iol_question_number: number;
  iol_question_title: string;
  iol_url: string;
  iol_location: string;
}

/** A grouped Linguini question (1+ sub-parts sharing the same IOL question). */
export interface LinguiniQuestion {
  id: string; // e.g. "iol-2023-1"
  year: number;
  questionNumber: number;
  title: string;
  url: string;
  location: string;
  parts: LinguiniEntry[];
}

/** Load and group Linguini dataset entries by question. */
export function loadLinguiniQuestions(): LinguiniQuestion[] {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const filePath = resolve(__dirname, 'linguini', 'dataset_enriched.jsonl');
  const raw = readFileSync(filePath, 'utf-8');
  const entries: LinguiniEntry[] = raw
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as LinguiniEntry);

  const grouped = new Map<string, LinguiniQuestion>();
  for (const entry of entries) {
    const key = `iol-${entry.iol_year}-${entry.iol_question_number}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        year: entry.iol_year,
        questionNumber: entry.iol_question_number,
        title: entry.iol_question_title,
        url: entry.iol_url,
        location: entry.iol_location,
        parts: [],
      });
    }
    grouped.get(key)!.parts.push(entry);
  }

  return Array.from(grouped.values()).sort(
    (a, b) => a.year - b.year || a.questionNumber - b.questionNumber,
  );
}

/** Build the problem text for a Linguini question (context + all sub-part queries). */
export function buildLinguiniProblemText(question: LinguiniQuestion): string {
  // All parts share the same context; queries differ
  const firstPart = question.parts[0];
  if (!firstPart) {
    return '';
  }
  const context = firstPart.context;
  const queries = question.parts.map((p) => p.query);
  return `${context}\n\n${queries.join('\n\n')}`;
}
