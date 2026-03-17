import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const hasServerKey = !!process.env.OPENROUTER_API_KEY;

  const userKey = req.headers.get('x-openrouter-key');
  const effectiveKey = userKey || process.env.OPENROUTER_API_KEY;

  if (!effectiveKey) {
    return NextResponse.json({ remaining: null, hasServerKey });
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: { Authorization: `Bearer ${effectiveKey}` },
    });

    if (!res.ok) {
      return NextResponse.json({ remaining: null, hasServerKey, error: 'Failed to fetch credits' });
    }

    const json = await res.json();
    const { total_credits, total_usage } = json.data ?? json;
    const remaining = total_credits - total_usage;
    return NextResponse.json({ remaining, hasServerKey });
  } catch {
    return NextResponse.json({ remaining: null, hasServerKey, error: 'Failed to fetch credits' });
  }
}
