export interface ExampleProblem {
  id: string;
  label: string;
  language: string;
  source: string;
  inputFile: string;
}

export const EXAMPLE_PROBLEMS: ExampleProblem[] = [
  {
    id: 'saisiyat',
    label: 'Saisiyat (UKLO 2025)',
    language: 'Saisiyat',
    source: 'UKLO',
    inputFile: 'uklo_2025R1P3_MoSy_Rosetta_Austr_Saisiyat_Input.md',
  },
  {
    id: 'forest-enets',
    label: 'Forest Enets (Onling 2024)',
    language: 'Forest Enets',
    source: 'Onling.org',
    inputFile: 'onling_2024P1_MoSyPh_Rosetta_Uralic_Forest-Enets_Input.md',
  },
  {
    id: 'okinawan',
    label: 'Okinawan (Onling 2024)',
    language: 'Okinawan',
    source: 'Onling.org',
    inputFile: 'onling_2024P3_MoSyPh_Rosetta_Japonic_Okinawan_Input.md',
  },
];
