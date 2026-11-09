"use strict";

const pool = require("../db/pool");
const { createServiceLogger } = require("../utils/logger");

const logger = createServiceLogger("txIdempotencyService");

class IdempotencyConflictError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.name = "IdempotencyConflictError";
    this.status = status;
  }
}

// In-memory fallback map when DB is unmocked in lightweight unit tests
const memLocks = new Map();

/**
 * Attempts to acquire an exclusive idempotency lock for a transaction key.
 *
 * @param {string} idempotencyKey
 * @param {object} [options]
 * @param {number} [options.ttlSeconds=300]
 * @returns {Promise<{ acquired: boolean, cachedResult?: any }>}
 */
async function acquireTxLock(idempotencyKey, options = {}) {
  if (!idempotencyKey || typeof idempotencyKey !== "string") {
    throw new Error("idempotencyKey must be a non-empty string");
  }

  const ttlSeconds = options.ttlSeconds || 300;
  const now = Date.now();

  // Try DB first if table exists
  try {
    const res = await pool.query(
      `INSERT INTO idempotency_keys (key, status, created_at, expires_at)
       VALUES ($1, 'PROCESSING', NOW(), NOW() + ($2 || ' seconds')::INTERVAL)
       ON CONFLICT (key) DO UPDATE
         SET status = 'PROCESSING'
         WHERE idempotency_keys.expires_at < NOW()
       RETURNING key, status, response_body`,
      [idempotencyKey, ttlSeconds]
    );

    if (res.rows.length > 0) {
      return { acquired: true };
    }

    // Key exists and not expired
    const existing = await pool.query(
      `SELECT status, response_body FROM idempotency_keys WHERE key = $1`,
      [idempotencyKey]
    );

    const record = existing.rows[0];
    if (record?.status === "COMPLETED") {
      return { acquired: false, status: "COMPLETED", cachedResult: record.response_body };
    }

    throw new IdempotencyConflictError(
      `Transaction with idempotency key '${idempotencyKey}' is already processing`
    );
  } catch (err) {
    if (err instanceof IdempotencyConflictError) throw err;

    // In-memory fallback for environments without migration or during mock tests
    const existing = memLocks.get(idempotencyKey);
    if (existing && existing.expiresAt > now) {
      if (existing.status === "COMPLETED") {
        return { acquired: false, status: "COMPLETED", cachedResult: existing.result };
      }
      throw new IdempotencyConflictError(
        `Transaction with idempotency key '${idempotencyKey}' is already processing`
      );
    }

    memLocks.set(idempotencyKey, {
      status: "PROCESSING",
      expiresAt: now + ttlSeconds * 1000,
      result: null,
    });
    return { acquired: true };
  }
}

/**
 * Marks the idempotency key as COMPLETED and caches the result payload.
 */
async function completeTxLock(idempotencyKey, result) {
  try {
    await pool.query(
      `UPDATE idempotency_keys
       SET status = 'COMPLETED', response_body = $2
       WHERE key = $1`,
      [idempotencyKey, JSON.stringify(result)]
    );
  } catch {
    // Memory fallback
  }

  const mem = memLocks.get(idempotencyKey);
  if (mem) {
    mem.status = "COMPLETED";
    mem.result = result;
  }
}

/**
 * Releases/deletes the lock on failure so the client can retry safely.
 */
async function releaseTxLock(idempotencyKey) {
  try {
    await pool.query(`DELETE FROM idempotency_keys WHERE key = $1`, [idempotencyKey]);
  } catch {
    // Memory fallback
  }
  memLocks.delete(idempotencyKey);
}

module.exports = {
  acquireTxLock,
  completeTxLock,
  releaseTxLock,
  IdempotencyConflictError,
  memLocks,
};
