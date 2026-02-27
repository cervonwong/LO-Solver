import type { Agent } from '@mastra/core/agent';

interface GenerateWithRetryOptions<TOptions> {
  prompt: string;
  options?: TOptions;
  timeoutMs?: number; // Default: 600,000 (10 minutes)
  maxRetries?: number; // Default: 2 (3 total attempts)
  abortSignal?: AbortSignal; // Caller-provided abort signal
}

/**
 * Wrapper around Agent.generate with timeout and retry logic.
 *
 * - Timeout: Aborts the request via AbortController if it takes longer than timeoutMs
 * - Retries: Retries up to maxRetries times on transient errors
 * - AbortSignal: Accepts optional caller signal; merged with internal timeout signal
 *   via AbortSignal.any() so either can cancel the operation
 *
 * @throws After all retries are exhausted, or if the caller signal aborts
 */
export async function generateWithRetry<TOptions extends Parameters<Agent['generate']>[1]>(
  agent: Agent,
  {
    prompt,
    options,
    timeoutMs = 600_000,
    maxRetries = 2,
    abortSignal: callerSignal,
  }: GenerateWithRetryOptions<TOptions>,
): Promise<Awaited<ReturnType<Agent['generate']>>> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // If the caller has already aborted, don't start another attempt
    callerSignal?.throwIfAborted();

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

    // Merge caller signal (if any) with our timeout signal
    const mergedSignal = callerSignal
      ? AbortSignal.any([callerSignal, timeoutController.signal])
      : timeoutController.signal;

    try {
      const result = await agent.generate(prompt, {
        ...options,
        abortSignal: mergedSignal,
      } as TOptions);

      // Clean up timeout on success
      clearTimeout(timeoutId);

      // Check for empty response - this should trigger a retry
      // When structuredOutput is provided, check result.object; otherwise check result.text
      const hasStructuredOutput =
        options && typeof options === 'object' && 'structuredOutput' in options;

      if (hasStructuredOutput) {
        if (result.object === null || result.object === undefined) {
          throw new Error('Empty response from model');
        }
      } else {
        if (!result.text || result.text.trim() === '') {
          throw new Error('Empty response from model');
        }
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      lastError = error instanceof Error ? error : new Error(String(error));

      // If the caller aborted, don't retry — propagate immediately
      if (callerSignal?.aborted) {
        throw lastError;
      }

      // Normalize abort errors from timeout into a timeout message
      if (timeoutController.signal.aborted && lastError.name === 'AbortError') {
        lastError = new Error(`Timeout after ${timeoutMs}ms`, { cause: lastError });
      }

      // Check if this is a retryable error
      const isRetryable =
        lastError.name === 'AI_APICallError' ||
        lastError.message.includes('Provider returned error') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('Timeout') ||
        lastError.message.includes('ECONNRESET') ||
        lastError.message.includes('ETIMEDOUT') ||
        lastError.message.includes('fetch failed') ||
        lastError.message.includes('network') ||
        lastError.message.includes('Empty response from model');

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff (5s, 10s, 15s)
      const delayMs = 5000 * (attempt + 1);

      console.warn(
        `[generateWithRetry] Attempt ${attempt + 1} failed: ${lastError.message}. ` +
          `Retrying in ${delayMs / 1000} seconds... (${maxRetries - attempt} retries remaining)`,
      );

      // Wait before retrying (also respect caller abort during backoff)
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          clearTimeout(backoffTimeout);
          reject(callerSignal!.reason);
        };
        const backoffTimeout = setTimeout(() => {
          callerSignal?.removeEventListener('abort', onAbort);
          resolve();
        }, delayMs);
        callerSignal?.addEventListener('abort', onAbort, { once: true });
      });
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError ?? new Error('Unknown error in generateWithRetry');
}
