"use strict";

const {
  acquireLock,
  withLock,
  _clearMemoryLocksForTest,
} = require("./distributedLock");

describe("distributedLock", () => {
  beforeEach(() => {
    _clearMemoryLocksForTest();
  });

  it("acquires and releases a lock successfully", async () => {
    const lock = await acquireLock("lock:job:123", { ttlMs: 5000 });
    expect(lock.acquired).toBe(true);
    expect(typeof lock.token).toBe("string");

    const released = await lock.release();
    expect(released).toBe(true);
  });

  it("prevents concurrent acquisition while lock is held", async () => {
    const lock1 = await acquireLock("lock:job:concurrent", { ttlMs: 5000 });
    expect(lock1.acquired).toBe(true);

    const lock2 = await acquireLock("lock:job:concurrent", { ttlMs: 5000, retryCount: 0 });
    expect(lock2.acquired).toBe(false);

    await lock1.release();

    const lock3 = await acquireLock("lock:job:concurrent", { ttlMs: 5000 });
    expect(lock3.acquired).toBe(true);
    await lock3.release();
  });

  it("extends lock expiration", async () => {
    const lock = await acquireLock("lock:job:extend", { ttlMs: 2000 });
    expect(lock.acquired).toBe(true);

    const extended = await lock.extend(10000);
    expect(extended).toBe(true);

    await lock.release();
  });

  it("executes work within withLock and releases on completion", async () => {
    let executed = false;
    const result = await withLock("lock:job:withlock", async () => {
      executed = true;
      return "done";
    });

    expect(result).toBe("done");
    expect(executed).toBe(true);

    // Verify lock is released and can be reacquired
    const lock = await acquireLock("lock:job:withlock", { ttlMs: 1000 });
    expect(lock.acquired).toBe(true);
    await lock.release();
  });

  it("guarantees lock release when operation throws inside withLock", async () => {
    await expect(
      withLock("lock:job:throw", async () => {
        throw new Error("Internal processing failure");
      })
    ).rejects.toThrow("Internal processing failure");

    // Lock must be released
    const lock = await acquireLock("lock:job:throw", { ttlMs: 1000 });
    expect(lock.acquired).toBe(true);
    await lock.release();
  });
});
