"use strict";

const { createServiceLogger } = require("../utils/logger");

const logger = createServiceLogger("soroban-circuit-breaker");

/**
 * Circuit breaker state machine for protecting against cascading Soroban RPC / Horizon outages.
 */
class SorobanCircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeoutMs = options.resetTimeoutMs || 10000;
    this.halfOpenProbeCount = options.halfOpenProbeCount || 2;

    this.state = "CLOSED"; // CLOSED | OPEN | HALF_OPEN
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = null;
  }

  getState() {
    if (this.state === "OPEN" && this.lastFailureTime) {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        this.consecutiveSuccesses = 0;
        logger.info("Soroban circuit breaker entered HALF_OPEN state; probing upstream health.");
      }
    }
    return this.state;
  }

  recordSuccess() {
    if (this.state === "HALF_OPEN") {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= this.halfOpenProbeCount) {
        this.state = "CLOSED";
        this.consecutiveFailures = 0;
        this.consecutiveSuccesses = 0;
        this.lastFailureTime = null;
        logger.info("Soroban circuit breaker recovered to CLOSED state.");
      }
    } else if (this.state === "CLOSED") {
      this.consecutiveFailures = 0;
    }
  }

  recordFailure(err) {
    this.lastFailureTime = Date.now();

    if (this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.consecutiveFailures = this.failureThreshold;
      logger.warn("Probe failed during HALF_OPEN state; re-opening Soroban circuit breaker.");
    } else if (this.state === "CLOSED") {
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= this.failureThreshold) {
        this.state = "OPEN";
        logger.error({
          event: "soroban_circuit_breaker_tripped",
          failures: this.consecutiveFailures,
          error: err?.message || err,
        });
      }
    }
  }

  reset() {
    this.state = "CLOSED";
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = null;
  }
}

const defaultBreaker = new SorobanCircuitBreaker();

/**
 * Express middleware to short-circuit requests when upstream Soroban RPC is unhealthy.
 *
 * @param {Object} [options]
 * @param {SorobanCircuitBreaker} [options.breaker]
 */
function createSorobanCircuitMiddleware(options = {}) {
  const breaker = options.breaker || defaultBreaker;

  return function sorobanCircuitMiddleware(req, res, next) {
    const currentState = breaker.getState();

    req.sorobanCircuit = breaker;

    if (currentState === "OPEN") {
      const resetTimeoutSeconds = Math.ceil(breaker.resetTimeoutMs / 1000);
      res.setHeader("Retry-After", resetTimeoutSeconds);
      res.setHeader("Cache-Control", "no-store");

      return res.status(503).json({
        error: "Stellar Soroban network is temporarily degraded. Upstream circuit breaker is active.",
        code: "STELLAR_CIRCUIT_OPEN",
        retryAfter: resetTimeoutSeconds,
      });
    }

    // Capture response to auto-track 5xx errors from upstream
    const originalEnd = res.end;
    res.end = function (...args) {
      if (res.statusCode >= 502 && res.statusCode <= 504) {
        breaker.recordFailure(new Error(`Upstream returned ${res.statusCode}`));
      } else if (res.statusCode >= 200 && res.statusCode < 400) {
        breaker.recordSuccess();
      }
      return originalEnd.apply(this, args);
    };

    next();
  };
}

module.exports = {
  SorobanCircuitBreaker,
  createSorobanCircuitMiddleware,
  defaultBreaker,
};
