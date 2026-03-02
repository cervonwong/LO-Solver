import type { Agent } from '@mastra/core/agent';
import type { FullOutput } from '@mastra/core/stream';
import { formatTimestamp } from './logging-utils';

/**
 * What constitutes a valid (non-empty) response from the agent.
 * - 'text': require non-empty result.text (default for agents without structuredOutput)
 * - 'structuredOutput': require non-null result.object (default when structuredOutput option is set)
 * - 'toolActivity': require multi-step execution (tool calls happened); text may be empty
 */
type ResponseCheck = 'text' | 'structuredOutput' | 'toolActivity';

interface GenerateWithRetryOptions<TOptions> {
  prompt: string;
  options?: TOptions;
  timeoutMs?: number; // Default: 600,000 (10 minutes)
  maxRetries?: number; // Default: 2 (3 total attempts)
  abortSignal?: AbortSignal; // Caller-provided abort signal
  responseCheck?: ResponseCheck; // Default: auto-detected from options
}

/**
 * Wrapper around Agent.generate with timeout and retry logic.
 *
 * Uses a two-layer timeout strategy:
 * 1. AbortSignal passed to agent.generate() for cooperative cancellation
 * 2. Promise.race as a hard fallback — guarantees timeout even if the agent
 *    doesn't respect the abort signal (e.g., during multi-step tool loops)
 *
 * When the hard timeout fires, it also aborts the controller so the agent
 * gets a cancellation signal for eventual cleanup.
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
    responseCheck: explicitResponseCheck,
  }: GenerateWithRetryOptions<TOptions>,
): Promise<Awaited<ReturnType<Agent['generate']>>> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // If the caller has already aborted, don't start another attempt
    callerSignal?.throwIfAborted();

    const timeoutController = new AbortController();

    // Merge caller signal (if any) with our timeout signal
    const mergedSignal = callerSignal
      ? AbortSignal.any([callerSignal, timeoutController.signal])
      : timeoutController.signal;

    // Hard timeout promise — guarantees we don't hang even if the agent
    // ignores the abort signal (e.g., stuck in a multi-step tool loop)
    let hardTimeoutId: ReturnType<typeof setTimeout>;
    const hardTimeoutPromise = new Promise<never>((_, reject) => {
      hardTimeoutId = setTimeout(() => {
        // Also signal the abort controller so the agent gets eventual cleanup
        timeoutController.abort();
        reject(new Error(`Timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      // Race between the generate call and the hard timeout.
      // The abortSignal provides cooperative cancellation; the race provides
      // a guaranteed fallback if abort isn't respected.
      const result = await Promise.race([
        agent.generate(prompt, {
          ...options,
          abortSignal: mergedSignal,
        } as TOptions),
        hardTimeoutPromise,
      ]);

      // Clean up timeout on success
      clearTimeout(hardTimeoutId!);

      // Determine what counts as a valid response
      const check =
        explicitResponseCheck ??
        (options && typeof options === 'object' && 'structuredOutput' in options
          ? 'structuredOutput'
          : 'text');

      if (check === 'structuredOutput') {
        if (result.object === null || result.object === undefined) {
          throw new Error('Empty response from model');
        }
      } else if (check === 'toolActivity') {
        if (!result.steps || result.steps.length <= 1) {
          throw new Error('Empty response from model (no tool activity)');
        }
      } else {
        if (!result.text || result.text.trim() === '') {
          throw new Error('Empty response from model');
        }
      }

      return result;
    } catch (error) {
      clearTimeout(hardTimeoutId!);
      // Ensure abort is signaled for cleanup of any in-flight agent work
      if (!timeoutController.signal.aborted) {
        timeoutController.abort();
      }

      lastError = error instanceof Error ? error : new Error(String(error));

      // If the caller aborted, don't retry — propagate immediately
      if (callerSignal?.aborted) {
        throw lastError;
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

      // Calculate delay with linear backoff (5s, 10s, 15s)
      const delayMs = 5000 * (attempt + 1);

      console.warn(
        `${formatTimestamp()} [generateWithRetry] Attempt ${attempt + 1} failed: ${lastError.message}. ` +
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

interface StreamWithRetryOptions<TOptions> {
  prompt: string;
  options?: TOptions;
  timeoutMs?: number; // Default: 600,000 (10 minutes)
  maxRetries?: number; // Default: 2 (3 total attempts)
  abortSignal?: AbortSignal; // Caller-provided abort signal
  onTextChunk?: (chunk: string) => void; // Callback for real-time text streaming
  responseCheck?: ResponseCheck; // Default: auto-detected from options
}

/**
 * Wrapper around Agent.stream with timeout, retry, and real-time text callback.
 *
 * Uses the same two-layer timeout strategy as generateWithRetry:
 * 1. AbortSignal passed to agent.stream() for cooperative cancellation
 * 2. Promise.race as a hard fallback
 *
 * Consumes the textStream to forward chunks via onTextChunk, then calls
 * getFullOutput() for the complete result (text, object, toolCalls, etc.).
 *
 * @returns The FullOutput from the completed stream (has .text, .object, .reasoning, etc.)
 * @throws After all retries are exhausted, or if the caller signal aborts
 */
export async function streamWithRetry<TOptions extends Parameters<Agent['generate']>[1]>(
  agent: Agent,
  {
    prompt,
    options,
    timeoutMs = 600_000,
    maxRetries = 2,
    abortSignal: callerSignal,
    onTextChunk,
    responseCheck: explicitResponseCheck,
  }: StreamWithRetryOptions<TOptions>,
): Promise<FullOutput> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // If the caller has already aborted, don't start another attempt
    callerSignal?.throwIfAborted();

    const timeoutController = new AbortController();

    // Merge caller signal (if any) with our timeout signal
    const mergedSignal = callerSignal
      ? AbortSignal.any([callerSignal, timeoutController.signal])
      : timeoutController.signal;

    // Hard timeout promise — guarantees we don't hang even if the agent
    // ignores the abort signal
    let hardTimeoutId: ReturnType<typeof setTimeout>;
    const hardTimeoutPromise = new Promise<never>((_, reject) => {
      hardTimeoutId = setTimeout(() => {
        timeoutController.abort();
        reject(new Error(`Timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      // Race between the stream consumption and the hard timeout
      const result = await Promise.race([
        (async () => {
          const streamOutput = await agent.stream(prompt, {
            ...options,
            abortSignal: mergedSignal,
          } as Parameters<Agent['stream']>[1]);

          // Consume the textStream, forwarding chunks via callback
          const reader = streamOutput.textStream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (onTextChunk && value) {
                onTextChunk(value);
              }
            }
          } finally {
            reader.releaseLock();
          }

          // Get the complete result after stream is consumed
          return streamOutput.getFullOutput();
        })(),
        hardTimeoutPromise,
      ]);

      // Clean up timeout on success
      clearTimeout(hardTimeoutId!);

      // Determine what counts as a valid response
      const check =
        explicitResponseCheck ??
        (options && typeof options === 'object' && 'structuredOutput' in options
          ? 'structuredOutput'
          : 'text');

      if (check === 'structuredOutput') {
        if (result.object === null || result.object === undefined) {
          throw new Error('Empty response from model');
        }
      } else if (check === 'toolActivity') {
        if (!result.steps || result.steps.length <= 1) {
          throw new Error('Empty response from model (no tool activity)');
        }
      } else {
        if (!result.text || result.text.trim() === '') {
          throw new Error('Empty response from model');
        }
      }

      return result;
    } catch (error) {
      clearTimeout(hardTimeoutId!);
      // Ensure abort is signaled for cleanup of any in-flight stream
      if (!timeoutController.signal.aborted) {
        timeoutController.abort();
      }

      lastError = error instanceof Error ? error : new Error(String(error));

      // If the caller aborted, don't retry — propagate immediately
      if (callerSignal?.aborted) {
        throw lastError;
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

      // Calculate delay with linear backoff (5s, 10s, 15s)
      const delayMs = 5000 * (attempt + 1);

      console.warn(
        `${formatTimestamp()} [streamWithRetry] Attempt ${attempt + 1} failed: ${lastError.message}. ` +
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
  throw lastError ?? new Error('Unknown error in streamWithRetry');
}
