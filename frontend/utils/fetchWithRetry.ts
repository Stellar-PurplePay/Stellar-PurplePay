export interface FetchRetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryOnStatus?: number[];
  onRetry?: (attempt: number, delayMs: number, status?: number) => void;
}

export type FetchWithRetryInit = RequestInit & FetchRetryOptions;

/**
 * Resilient fetch wrapper with automatic exponential backoff retry for transient network
 * failures and server rate-limiting (HTTP 429) or upstream degradation (HTTP 502/503/504).
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: FetchWithRetryInit = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelayMs = 500,
    maxDelayMs = 5000,
    backoffMultiplier = 2,
    retryOnStatus = [429, 502, 503, 504],
    onRetry,
    ...fetchInit
  } = init;

  let attempt = 0;

  while (true) {
    if (fetchInit.signal?.aborted) {
      throw new DOMException("The user aborted a request.", "AbortError");
    }

    try {
      const response = await fetch(input, fetchInit);

      if (response.ok || !retryOnStatus.includes(response.status) || attempt >= maxRetries) {
        return response;
      }

      attempt++;

      // Check for server-instructed Retry-After header
      const retryAfterHeader = response.headers.get("Retry-After");
      let delayMs = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);

      if (retryAfterHeader) {
        const parsedSeconds = parseInt(retryAfterHeader, 10);
        if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
          delayMs = parsedSeconds * 1000;
        }
      }

      delayMs = Math.min(delayMs, maxDelayMs);

      if (onRetry) {
        onRetry(attempt, delayMs, response.status);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } catch (err: any) {
      if (err.name === "AbortError" || attempt >= maxRetries) {
        throw err;
      }

      attempt++;
      const delayMs = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt - 1),
        maxDelayMs
      );

      if (onRetry) {
        onRetry(attempt, delayMs);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
