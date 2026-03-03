import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return NextResponse.json({ remaining: null, error: 'API key not configured' });
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: { Authorization: `Bearer ${key}` },
    });

    if (!res.ok) {
      return NextResponse.json({ remaining: null, error: 'Failed to fetch credits' });
    }

    const json = await res.json();
    console.log('[credits] OpenRouter response:', JSON.stringify(json));
    const { total_credits, total_usage } = json.data ?? json;
    const remaining = total_credits - total_usage;
    return NextResponse.json({ remaining });
  } catch {
    return NextResponse.json({ remaining: null, error: 'Failed to fetch credits' });
  }
}
