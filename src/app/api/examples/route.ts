import { NextResponse } from 'next/server';
import { getAllExampleOptions } from '@/lib/examples-server';

export async function GET() {
  const options = getAllExampleOptions();
  return NextResponse.json({ examples: options });
}
