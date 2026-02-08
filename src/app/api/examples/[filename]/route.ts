import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

const EXAMPLES_DIR = join(process.cwd(), 'examples');

const ALLOWED_FILES = new Set([
  'uklo_2025R1P3_MoSy_Rosetta_Austr_Saisiyat_Input.md',
  'onling_2024P1_MoSyPh_Rosetta_Uralic_Forest-Enets_Input.md',
  'onling_2024P3_MoSyPh_Rosetta_Japonic_Okinawan_Input.md',
]);

export async function GET(_req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;

  if (!ALLOWED_FILES.has(filename)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const content = await readFile(join(EXAMPLES_DIR, filename), 'utf-8');
  return new NextResponse(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
