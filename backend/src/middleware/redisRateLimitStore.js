/**
 * src/middleware/redisRateLimitStore.js
 *
 * express-rate-limit custom store backed by Redis with graceful fallback.
 */
"use strict";

const cache = require("../services/cacheService");

function storeUnavailableError(cause) {
  const err = new Error("Rate limiting service unavailable");
  err.status = 503;
  err.cause = cause;
  return err;
}

function getRateLimitRedisClient() {
  try {
    return cache.getClient ? cache.getClient() : null;
  } catch (_e) {
    return null;
  }
}

class RedisRateLimitStore {
  constructor(options = {}) {
    this.prefix = options.prefix || "";
    this.client = options.client || null;
    this.localKeys = false;
    this.windowMs = 60 * 1000;
    this._memoryFallback = new Map();
  }

  init(options) {
    if (options && options.windowMs) {
      this.windowMs = Number(options.windowMs);
    }
  }

  getClient() {
    return this.client || getRateLimitRedisClient();
  }

  async increment(key) {
    const redis = this.getClient();
    const fullKey = `${this.prefix}${key}`;
    const now = Date.now();

    if (redis && typeof redis.eval === "function") {
      try {
        const ttlSeconds = Math.max(1, Math.ceil(this.windowMs / 1000));
        const script =
          "local c = redis.call('INCR', KEYS[1])\n" +
          "if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end\n" +
          "local t = redis.call('TTL', KEYS[1])\n" +
          "return {c, t}";
        const res = await redis.eval(script, 1, fullKey, ttlSeconds);
        const count = Number(res[0]) || 1;
        const ttl = Number(res[1]) > 0 ? Number(res[1]) : ttlSeconds;
        return {
          totalHits: count,
          resetTime: new Date(now + ttl * 1000),
        };
      } catch (err) {
        console.warn("[RedisRateLimitStore] Redis eval failed, falling back to in-memory:", err.message);
      }
    }

    let record = this._memoryFallback.get(fullKey);
    if (!record || record.expiresAt <= now) {
      record = { totalHits: 0, expiresAt: now + this.windowMs };
    }
    record.totalHits += 1;
    this._memoryFallback.set(fullKey, record);

    return {
      totalHits: record.totalHits,
      resetTime: new Date(record.expiresAt),
    };
  }

  async decrement(key) {
    const redis = this.getClient();
    const fullKey = `${this.prefix}${key}`;

    if (redis && typeof redis.decr === "function") {
      try {
        await redis.decr(fullKey);
        return;
      } catch (_e) {
        // fallback
      }
    }

    const record = this._memoryFallback.get(fullKey);
    if (!record) return;
    if (record.totalHits <= 1) {
      this._memoryFallback.delete(fullKey);
    } else {
      record.totalHits -= 1;
      this._memoryFallback.set(fullKey, record);
    }
  }

  async resetKey(key) {
    const redis = this.getClient();
    const fullKey = `${this.prefix}${key}`;

    if (redis && typeof redis.del === "function") {
      try {
        await redis.del(fullKey);
      } catch (_e) {
        // fallback
      }
    }
    this._memoryFallback.delete(fullKey);
  }
}

module.exports = {
  RedisRateLimitStore,
  getRateLimitRedisClient,
  storeUnavailableError,
};
