"use strict";

const {
  executeWithRetry,
  isRetryableError,
} = require("./sorobanClient");

describe("sorobanClient - executeWithRetry", () => {
  it("resolves immediately on first attempt when operation succeeds", async () => {
    const fn = jest.fn().mockResolvedValue("sim-success");
    const result = await executeWithRetry(fn);

    expect(result).toBe("sim-success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries transient errors and succeeds on subsequent attempt", async () => {
    const transientError = new Error("Rate limit exceeded");
    transientError.statusCode = 429;

    const fn = jest
      .fn()
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce("recovered-after-retry");

    const result = await executeWithRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
      maxDelayMs: 50,
    });

    expect(result).toBe("recovered-after-retry");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("exhausts max retries and throws the final error when persistent", async () => {
    const timeoutError = new Error("ETIMEDOUT connection dropped");

    const fn = jest.fn().mockRejectedValue(timeoutError);

    await expect(
      executeWithRetry(fn, {
        maxRetries: 3,
        baseDelayMs: 5,
        maxDelayMs: 20,
      })
    ).rejects.toThrow("ETIMEDOUT");

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("fails fast without retry for non-transient errors", async () => {
    const clientError = new Error("Invalid contract invocation parameters");
    clientError.statusCode = 400;

    const fn = jest.fn().mockRejectedValue(clientError);

    await expect(
      executeWithRetry(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
      })
    ).rejects.toThrow("Invalid contract invocation parameters");

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("sorobanClient - isRetryableError", () => {
  it("identifies rate limit and gateway errors as retryable", () => {
    expect(isRetryableError({ statusCode: 429 })).toBe(true);
    expect(isRetryableError({ statusCode: 502 })).toBe(true);
    expect(isRetryableError({ statusCode: 503 })).toBe(true);
    expect(isRetryableError({ statusCode: 504 })).toBe(true);
  });

  it("identifies network socket drops and Soroban RPC -32603 internal errors as retryable", () => {
    expect(isRetryableError(new Error("connect ETIMEDOUT 54.210.12.1"))).toBe(true);
    expect(isRetryableError(new Error("read ECONNRESET"))).toBe(true);
    expect(isRetryableError(new Error("JSON-RPC error -32603: Internal error"))).toBe(true);
  });

  it("rejects client errors as non-retryable", () => {
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError({ statusCode: 400 })).toBe(false);
    expect(isRetryableError({ statusCode: 404 })).toBe(false);
    expect(isRetryableError(new Error("Malformed XDR envelope"))).toBe(false);
  });
});
