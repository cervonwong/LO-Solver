import { NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function GET() {
  try {
    const { stdout } = await execFileAsync('claude', ['auth', 'status', '--json'], {
      timeout: 5000,
    });

    const parsed = JSON.parse(stdout);
    const authenticated = parsed?.authenticated === true;

    return NextResponse.json({
      authenticated,
      email: parsed?.email ?? undefined,
      subscriptionType: parsed?.subscriptionType ?? undefined,
    });
  } catch (err: unknown) {
    const error =
      err instanceof Error && 'code' in err && (err as { code: string }).code === 'ENOENT'
        ? 'Claude CLI not found'
        : err instanceof Error
          ? err.message
          : 'Unknown error';

    return NextResponse.json({
      authenticated: false,
      error,
    });
  }
}
