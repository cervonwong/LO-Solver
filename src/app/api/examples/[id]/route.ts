import { NextResponse } from 'next/server';
import { EXAMPLE_PROBLEMS } from '@/lib/examples';
import { readExampleProblem, readLinguiniProblem } from '@/lib/examples-server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Check if this is a Linguini ID (format: "iol-YYYY-N")
  if (id.startsWith('iol-')) {
    try {
      const text = readLinguiniProblem(id);
      return NextResponse.json({ text });
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  }

  // Existing hand-curated examples
  const example = EXAMPLE_PROBLEMS.find((e) => e.id === id);
  if (!example) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const text = readExampleProblem(id);
  return NextResponse.json({ text });
}
