import { NextResponse } from 'next/server';
import { loadEvalRuns } from '@/evals/storage';

export async function GET() {
  const runs = await loadEvalRuns();
  return NextResponse.json(runs);
}
