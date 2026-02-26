export interface ExampleProblemMeta {
  id: string;
  language: string;
  source: string;
  inputFile: string;
  solutionFile: string;
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
    inputFile: 'uklo_2025R1P3_MoSy_Rosetta_Austr_Saisiyat_Input.md',
    solutionFile: 'uklo_2025R1P3_MoSy_Rosetta_Austr_Saisiyat_Solution.md',
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
    inputFile: 'onling_2024P1_MoSyPh_Rosetta_Uralic_Forest-Enets_Input.md',
    solutionFile: 'onling_2024P1_MoSyPh_Rosetta_Uralic_Forest-Enets_Solution.md',
    sourceUrl: 'https://onling.org/',
    problemUrl: 'https://onling.org/contests/student-2024/online/eng/',
    solutionUrl: 'https://onling.org/contests/student-2024/files/solutions.pdf',
  },
  {
    id: 'okinawan',
    language: 'Okinawan',
    source: 'Onling.org',
    inputFile: 'onling_2024P3_MoSyPh_Rosetta_Japonic_Okinawan_Input.md',
    solutionFile: 'onling_2024P3_MoSyPh_Rosetta_Japonic_Okinawan_Solution.md',
    sourceUrl: 'https://onling.org/',
    problemUrl: 'https://onling.org/contests/student-2024/online/eng/',
    solutionUrl: 'https://onling.org/contests/student-2024/files/solutions.pdf',
  },
];
