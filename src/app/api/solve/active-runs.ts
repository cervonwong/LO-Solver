// Module-level singleton that tracks active workflow runs for the cancel endpoint.
// Survives across requests in the same process. Entries are cleaned up on stream
// completion, failure, or cancellation via the finally block in route.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const activeRuns = new Map<string, any>();
