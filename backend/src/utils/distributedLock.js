"use strict";

const crypto = require("crypto");
const { getClient } = require("./cache");
const { createServiceLogger } = require("./logger");

const logger = createServiceLogger("distributedLock");

const RELEASE_LUA_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

const EXTEND_LUA_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("pexpire", KEYS[1], ARGV[2])
else
  return 0
end
`;

// In-memory fallback map for environments where Redis is unavailable (e.g. unit tests)
const memoryLocks = new Map();

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateToken() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
}

/**
 * Acquire a distributed lock.
 *
 * @param {string} key - Lock identifier (e.g. "lock:escrow:job-123")
 * @param {Object} [options]
 * @param {number} [options.ttlMs=10000] - Lock expiration in milliseconds
 * @param {number} [options.retryCount=0] - Number of retry attempts if lock is held
 * @param {number} [options.retryDelayMs=100] - Delay between retry attempts
 * @returns {Promise<{ acquired: boolean, token?: string, key: string, release: Function, extend: Function }>}
 */
async function acquireLock(key, options = {}) {
  const {
    ttlMs = 10000,
    retryCount = 0,
    retryDelayMs = 100,
  } = options;

  const redis = getClient();
  const token = generateToken();

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    if (redis && typeof redis.set === "function") {
      try {
        const res = await redis.set(key, token, "PX", ttlMs, "NX");
        if (res === "OK") {
          return {
            acquired: true,
            key,
            token,
            release: () => releaseLock(key, token),
            extend: (newTtlMs = ttlMs) => extendLock(key, token, newTtlMs),
          };
        }
      } catch (err) {
        logger.warn({ key, err: err.message }, "Redis acquireLock failed, falling back to local memory store");
      }
    } else {
      // Memory fallback
      const now = Date.now();
      const existing = memoryLocks.get(key);
      if (!existing || existing.expiresAt <= now) {
        memoryLocks.set(key, { token, expiresAt: now + ttlMs });
        return {
          acquired: true,
          key,
          token,
          release: () => releaseLock(key, token),
          extend: (newTtlMs = ttlMs) => extendLock(key, token, newTtlMs),
        };
      }
    }

    if (attempt < retryCount) {
      await wait(retryDelayMs);
    }
  }

  return {
    acquired: false,
    key,
    release: async () => false,
    extend: async () => false,
  };
}

/**
 * Atomically release a distributed lock if the token matches.
 *
 * @param {string} key
 * @param {string} token
 * @returns {Promise<boolean>}
 */
async function releaseLock(key, token) {
  if (!key || !token) return false;

  const redis = getClient();
  if (redis && typeof redis.eval === "function") {
    try {
      const res = await redis.eval(RELEASE_LUA_SCRIPT, 1, key, token);
      return Number(res) === 1;
    } catch (err) {
      logger.warn({ key, err: err.message }, "Redis releaseLock error");
    }
  }

  // Memory fallback
  const existing = memoryLocks.get(key);
  if (existing && existing.token === token) {
    memoryLocks.delete(key);
    return true;
  }
  return false;
}

/**
 * Extend the TTL of an active lock if the token matches.
 *
 * @param {string} key
 * @param {string} token
 * @param {number} ttlMs
 * @returns {Promise<boolean>}
 */
async function extendLock(key, token, ttlMs = 10000) {
  if (!key || !token) return false;

  const redis = getClient();
  if (redis && typeof redis.eval === "function") {
    try {
      const res = await redis.eval(EXTEND_LUA_SCRIPT, 1, key, token, ttlMs);
      return Number(res) === 1;
    } catch (err) {
      logger.warn({ key, err: err.message }, "Redis extendLock error");
    }
  }

  // Memory fallback
  const existing = memoryLocks.get(key);
  if (existing && existing.token === token) {
    existing.expiresAt = Date.now() + ttlMs;
    return true;
  }
  return false;
}

/**
 * Execute an asynchronous function wrapped in a distributed lock.
 * Automatically heartbeats (extends lock) if autoRenew is enabled,
 * and guarantees release in a finally block.
 *
 * @param {string} key - Lock identifier
 * @param {Function} fn - Async operation to execute while holding lock
 * @param {Object} [options]
 * @param {number} [options.ttlMs=10000] - Lock duration
 * @param {boolean} [options.autoRenew=true] - Continuously renew lock during long executions
 * @param {number} [options.retryCount=3] - Number of acquisition retries
 * @param {number} [options.retryDelayMs=150] - Interval between retries
 * @returns {Promise<any>} Result of `fn`
 */
async function withLock(key, fn, options = {}) {
  const {
    ttlMs = 10000,
    autoRenew = true,
    retryCount = 3,
    retryDelayMs = 150,
  } = options;

  const lock = await acquireLock(key, { ttlMs, retryCount, retryDelayMs });
  if (!lock.acquired) {
    const error = new Error(`Resource is currently locked: ${key}`);
    error.status = 409;
    error.code = "LOCK_ACQUISITION_FAILED";
    throw error;
  }

  let heartbeatInterval = null;
  if (autoRenew) {
    const intervalMs = Math.max(1000, Math.floor(ttlMs / 2));
    heartbeatInterval = setInterval(async () => {
      try {
        await lock.extend(ttlMs);
      } catch (err) {
        logger.warn({ key, err: err.message }, "Lock heartbeat auto-renewal failed");
      }
    }, intervalMs);
    if (heartbeatInterval.unref) heartbeatInterval.unref();
  }

  try {
    return await fn();
  } finally {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    await lock.release().catch(() => {});
  }
}

function _clearMemoryLocksForTest() {
  memoryLocks.clear();
}

module.exports = {
  acquireLock,
  releaseLock,
  extendLock,
  withLock,
  _clearMemoryLocksForTest,
};
