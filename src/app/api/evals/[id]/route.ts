import { NextResponse } from 'next/server';
import { loadEvalRun } from '@/evals/storage';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const run = await loadEvalRun(id);
  if (!run) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(run);
}
