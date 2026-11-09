"use strict";

const { getClientIp } = require("../utils/clientIp");
const { createServiceLogger } = require("../utils/logger");

const logger = createServiceLogger("stellar-rate-limiter");

/**
 * In-memory sliding window counter store for sub-minute precision.
 */
class MemorySlidingWindowStore {
  constructor() {
    this.hits = new Map();
  }

  /**
   * Records a hit and returns the total hits within the sliding window.
   *
   * @param {string} key
   * @param {number} windowMs
   * @returns {{ count: number, resetMs: number }}
   */
  increment(key, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;

    let timestamps = this.hits.get(key) || [];
    // Discard timestamps outside window
    timestamps = timestamps.filter((t) => t > windowStart);
    timestamps.push(now);

    this.hits.set(key, timestamps);

    // Periodically prune stale keys
    if (this.hits.size > 2000) {
      for (const [k, ts] of this.hits.entries()) {
        const active = ts.filter((t) => t > windowStart);
        if (active.length === 0) {
          this.hits.delete(k);
        } else {
          this.hits.set(k, active);
        }
      }
    }

    const oldest = timestamps[0];
    const resetMs = Math.max(0, oldest + windowMs - now);

    return {
      count: timestamps.length,
      resetMs,
    };
  }

  reset() {
    this.hits.clear();
  }
}

const defaultStore = new MemorySlidingWindowStore();

/**
 * Creates a sliding window rate limiter tailored for Stellar/Horizon/Soroban API routes.
 * Differentiates authenticated wallets from anonymous IP callers.
 *
 * @param {Object} options
 * @param {number} [options.windowMs=60000] - Sliding window duration in milliseconds
 * @param {number} [options.ipLimit=20] - Max requests for anonymous IP
 * @param {number} [options.walletLimit=80] - Max requests for authenticated Stellar wallet
 * @param {number} [options.burstAllowance=5] - Bonus burst limit
 * @param {Object} [options.store] - Custom store implementation
 */
function createStellarRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60000;
  const ipLimit = options.ipLimit || 20;
  const walletLimit = options.walletLimit || 80;
  const burstAllowance = options.burstAllowance || 5;
  const store = options.store || defaultStore;

  return function stellarRateLimitMiddleware(req, res, next) {
    const walletAddress =
      req.userAddress ||
      req.session?.userAddress ||
      req.headers["x-stellar-wallet"] ||
      null;

    const isWallet = Boolean(walletAddress);
    const baseLimit = isWallet ? walletLimit : ipLimit;
    const maxAllowed = baseLimit + burstAllowance;

    const clientIp = getClientIp(req);
    const rateLimitKey = isWallet
      ? `stellar:wallet:${walletAddress}`
      : `stellar:ip:${clientIp}`;

    const { count, resetMs } = store.increment(rateLimitKey, windowMs);
    const remaining = Math.max(0, maxAllowed - count);
    const resetSeconds = Math.ceil(resetMs / 1000);

    res.setHeader("X-RateLimit-Limit", maxAllowed);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetSeconds);

    if (count > maxAllowed) {
      res.setHeader("Retry-After", resetSeconds);
      res.setHeader("Cache-Control", "no-store");

      logger.warn({
        event: "stellar_rate_limit_exceeded",
        key: rateLimitKey,
        isWallet,
        count,
        maxAllowed,
        ip: clientIp,
      });

      return res.status(429).json({
        error: "Too many requests to Stellar infrastructure. Please slow down.",
        code: "STELLAR_RATE_LIMITED",
        retryAfter: resetSeconds,
        limit: maxAllowed,
      });
    }

    next();
  };
}

module.exports = {
  createStellarRateLimiter,
  MemorySlidingWindowStore,
};
