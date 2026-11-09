"use strict";

const crypto = require("crypto");
const { createServiceLogger } = require("../utils/logger");

const logger = createServiceLogger("distributed-lock-service");

class LockAcquisitionError extends Error {
  constructor(resourceKey, message) {
    super(message || `Could not acquire lock for resource: "${resourceKey}". Resource is busy.`);
    this.name = "LockAcquisitionError";
    this.code = "RESOURCE_LOCKED";
    this.status = 409;
    this.resourceKey = resourceKey;
  }
}

/**
 * Distributed Lock Manager providing mutual exclusion across concurrent operations
 * (e.g., milestone release, dispute settlement, batch payouts).
 * Backed by Redis when available, with automatic graceful fallback to memory.
 */
class DistributedLockService {
  constructor(options = {}) {
    this.redis = options.redis || null;
    this.logger = options.logger || logger;
    this.memoryLocks = new Map();
  }

  /**
   * Attempts to acquire an exclusive lock on a resource.
   *
   * @param {string} resourceKey - Identifier of the locked resource
   * @param {number} [ttlMs=10000] - Lock expiration in milliseconds
   * @param {string} [ownerId] - Unique lock owner identifier (auto-generated if omitted)
   * @returns {Promise<{ acquired: boolean, ownerId: string, resourceKey: string }>}
   */
  async acquire(resourceKey, ttlMs = 10000, ownerId = null) {
    const lockOwner = ownerId || crypto.randomUUID();
    const formattedKey = `lock:${resourceKey}`;

    if (this.redis) {
      try {
        const result = await this.redis.set(formattedKey, lockOwner, "PX", ttlMs, "NX");
        const acquired = result === "OK";
        return { acquired, ownerId: lockOwner, resourceKey };
      } catch (err) {
        this.logger.warn(`Redis lock acquire failed for "${formattedKey}", falling back to memory:`, err.message);
      }
    }

    // In-memory fallback
    const now = Date.now();
    const existing = this.memoryLocks.get(formattedKey);

    if (existing && existing.expiresAt > now) {
      return { acquired: false, ownerId: lockOwner, resourceKey };
    }

    this.memoryLocks.set(formattedKey, {
      ownerId: lockOwner,
      expiresAt: now + ttlMs,
    });

    return { acquired: true, ownerId: lockOwner, resourceKey };
  }

  /**
   * Safely releases a lock only if the current owner matches the caller.
   *
   * @param {string} resourceKey
   * @param {string} ownerId
   * @returns {Promise<boolean>}
   */
  async release(resourceKey, ownerId) {
    const formattedKey = `lock:${resourceKey}`;

    if (this.redis) {
      try {
        // Atomic compare-and-delete Lua script
        const luaScript = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        const result = await this.redis.eval(luaScript, 1, formattedKey, ownerId);
        return result === 1;
      } catch (err) {
        this.logger.warn(`Redis lock release failed for "${formattedKey}", falling back to memory:`, err.message);
      }
    }

    // In-memory fallback
    const existing = this.memoryLocks.get(formattedKey);
    if (!existing) return false;

    if (existing.ownerId === ownerId) {
      this.memoryLocks.delete(formattedKey);
      return true;
    }

    return false;
  }

  /**
   * Helper that wraps an async task with exclusive lock acquisition and guaranteed release.
   *
   * @template T
   * @param {string} resourceKey
   * @param {number} ttlMs
   * @param {() => Promise<T>} task
   * @returns {Promise<T>}
   */
  async withLock(resourceKey, ttlMs, task) {
    const lock = await this.acquire(resourceKey, ttlMs);
    if (!lock.acquired) {
      throw new LockAcquisitionError(resourceKey);
    }

    try {
      return await task();
    } finally {
      await this.release(resourceKey, lock.ownerId);
    }
  }

  clearMemoryLocks() {
    this.memoryLocks.clear();
  }
}

const defaultLockService = new DistributedLockService();

module.exports = {
  DistributedLockService,
  LockAcquisitionError,
  defaultLockService,
};
