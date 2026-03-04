import { activeRuns } from '../active-runs';

export async function POST() {
  const cancelled: string[] = [];

  for (const [runId, run] of activeRuns) {
    try {
      await run.cancel();
      cancelled.push(runId);
    } catch {
      // cancel() after completion is a no-op; swallow errors for idempotency
    }
  }

  return Response.json({ cancelled });
}
