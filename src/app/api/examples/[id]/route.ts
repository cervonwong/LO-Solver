import { NextResponse } from 'next/server';
import { EXAMPLE_PROBLEMS } from '@/lib/examples';
import { readExampleProblem } from '@/lib/examples-server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const example = EXAMPLE_PROBLEMS.find((e) => e.id === id);
  if (!example) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const text = readExampleProblem(id);
  return NextResponse.json({ text });
}
