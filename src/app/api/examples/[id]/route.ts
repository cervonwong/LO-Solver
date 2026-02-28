import { NextResponse } from 'next/server';
import { readExampleProblem, readLinguiniProblem, getAllExampleOptions } from '@/lib/examples-server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const example = getAllExampleOptions().find((e) => e.id === id);

  if (!example) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const text = example.type === 'linguini' ? readLinguiniProblem(id) : readExampleProblem(id);
  return NextResponse.json({ text });
}
