"use strict";

const {
  acquireTxLock,
  completeTxLock,
  releaseTxLock,
  IdempotencyConflictError,
  memLocks,
} = require("./txIdempotencyService");

describe("txIdempotencyService", () => {
  beforeEach(() => {
    memLocks.clear();
  });

  it("acquires lock on first request", async () => {
    const lock = await acquireTxLock("key-1", { ttlSeconds: 60 });
    expect(lock.acquired).toBe(true);
  });

  it("throws IdempotencyConflictError when duplicate concurrent request is made", async () => {
    await acquireTxLock("key-concurrent", { ttlSeconds: 60 });
    await expect(acquireTxLock("key-concurrent")).rejects.toThrow(IdempotencyConflictError);
  });

  it("returns cached result when previously completed", async () => {
    await acquireTxLock("key-completed", { ttlSeconds: 60 });
    await completeTxLock("key-completed", { txHash: "0xabc123" });

    const second = await acquireTxLock("key-completed");
    expect(second.acquired).toBe(false);
    expect(second.status).toBe("COMPLETED");
    expect(second.cachedResult).toEqual({ txHash: "0xabc123" });
  });

  it("allows re-acquiring lock after explicit release on failure", async () => {
    await acquireTxLock("key-retry", { ttlSeconds: 60 });
    await releaseTxLock("key-retry");

    const reacquired = await acquireTxLock("key-retry", { ttlSeconds: 60 });
    expect(reacquired.acquired).toBe(true);
  });
});
