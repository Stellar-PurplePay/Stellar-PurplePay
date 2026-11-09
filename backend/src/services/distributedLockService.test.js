"use strict";

const {
  DistributedLockService,
  LockAcquisitionError,
} = require("./distributedLockService");

describe("DistributedLockService", () => {
  let lockService;

  beforeEach(() => {
    lockService = new DistributedLockService();
  });

  afterEach(() => {
    lockService.clearMemoryLocks();
  });

  it("successfully acquires lock and denies concurrent acquisition", async () => {
    const lock1 = await lockService.acquire("escrow:job-1", 5000);
    expect(lock1.acquired).toBe(true);
    expect(lock1.ownerId).toBeDefined();

    // Second acquire fails
    const lock2 = await lockService.acquire("escrow:job-1", 5000);
    expect(lock2.acquired).toBe(false);
  });

  it("releases lock safely when owner matches", async () => {
    const lock = await lockService.acquire("escrow:job-2", 5000);
    expect(lock.acquired).toBe(true);

    // Wrong owner cannot release
    const wrongRelease = await lockService.release("escrow:job-2", "wrong-owner");
    expect(wrongRelease).toBe(false);

    // Valid owner releases
    const validRelease = await lockService.release("escrow:job-2", lock.ownerId);
    expect(validRelease).toBe(true);

    // Can acquire again after release
    const reacquire = await lockService.acquire("escrow:job-2", 5000);
    expect(reacquire.acquired).toBe(true);
  });

  it("auto-expires lock after TTL has passed", async () => {
    const lock = await lockService.acquire("escrow:job-3", 50); // 50ms TTL
    expect(lock.acquired).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 60));

    // After expiration, new caller can acquire
    const lockAfterExpiry = await lockService.acquire("escrow:job-3", 5000);
    expect(lockAfterExpiry.acquired).toBe(true);
  });

  it("withLock wraps task execution and guarantees release", async () => {
    const result = await lockService.withLock("escrow:job-4", 5000, async () => {
      return "settled";
    });

    expect(result).toBe("settled");

    // Lock is freed after withLock completes
    const reacquire = await lockService.acquire("escrow:job-4", 5000);
    expect(reacquire.acquired).toBe(true);
  });

  it("withLock releases lock even if task throws error", async () => {
    await expect(
      lockService.withLock("escrow:job-5", 5000, async () => {
        throw new Error("Simulation failed");
      })
    ).rejects.toThrow("Simulation failed");

    // Lock must be released
    const reacquire = await lockService.acquire("escrow:job-5", 5000);
    expect(reacquire.acquired).toBe(true);
  });

  it("withLock throws LockAcquisitionError if resource is locked", async () => {
    await lockService.acquire("escrow:job-6", 5000);

    await expect(
      lockService.withLock("escrow:job-6", 5000, async () => "work")
    ).rejects.toThrow(LockAcquisitionError);
  });

  it("operates with Redis client when provided", async () => {
    const mockRedis = {
      set: jest.fn().mockResolvedValue("OK"),
      eval: jest.fn().mockResolvedValue(1),
    };

    const redisLockService = new DistributedLockService({ redis: mockRedis });

    const lock = await redisLockService.acquire("escrow:job-redis", 10000, "owner-123");
    expect(lock.acquired).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith(
      "lock:escrow:job-redis",
      "owner-123",
      "PX",
      10000,
      "NX"
    );

    const released = await redisLockService.release("escrow:job-redis", "owner-123");
    expect(released).toBe(true);
    expect(mockRedis.eval).toHaveBeenCalled();
  });
});
