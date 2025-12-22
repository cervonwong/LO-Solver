import type { Agent } from '@mastra/core/agent';

interface GenerateWithRetryOptions<TOptions> {
  prompt: string;
  options?: TOptions;
  timeoutMs?: number; // Default: 600,000 (10 minutes)
  maxRetries?: number; // Default: 2 (3 total attempts)
}

/**
 * Wrapper around Agent.generate with timeout and retry logic.
 *
 * - Timeout: Aborts the request if it takes longer than timeoutMs
 * - Retries: Retries up to maxRetries times on transient errors
 *
 * @throws After all retries are exhausted
 */
export async function generateWithRetry<TOptions extends Parameters<Agent['generate']>[1]>(
  agent: Agent,
  { prompt, options, timeoutMs = 600_000, maxRetries = 2 }: GenerateWithRetryOptions<TOptions>,
): Promise<Awaited<ReturnType<Agent['generate']>>> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create a timeout promise that rejects after timeoutMs
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
      });

      // Race between the generate call and the timeout
      const result = await Promise.race([agent.generate(prompt, options), timeoutPromise]);

      // Check for empty response - this should trigger a retry
      // When structuredOutput is provided, check result.object; otherwise check result.text
      const hasStructuredOutput =
        options && typeof options === 'object' && 'structuredOutput' in options;

      if (hasStructuredOutput) {
        // For structured output, check if object is null/undefined
        if (result.object === null || result.object === undefined) {
          throw new Error('Empty response from model');
        }
      } else {
        // For text output, check if text is empty
        if (!result.text || result.text.trim() === '') {
          throw new Error('Empty response from model');
        }
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

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

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError ?? new Error('Unknown error in generateWithRetry');
}
