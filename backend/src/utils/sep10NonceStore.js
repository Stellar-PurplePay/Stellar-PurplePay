"use strict";

class NonceReplayError extends Error {
  constructor(message = "Cryptographic challenge nonce has already been consumed (replay attack detected)") {
    super(message);
    this.name = "NonceReplayError";
    this.code = "NONCE_REPLAY_DETECTED";
  }
}

class Sep10NonceStore {
  /**
   * @param {object} [options]
   * @param {number} [options.defaultTtlSeconds=300] - Default TTL before nonce can be purged
   */
  constructor(options = {}) {
    this.defaultTtlSeconds = options.defaultTtlSeconds || 300;
    this.store = new Map();
  }

  /**
   * Purge expired nonces from memory.
   * @param {number} [nowSeconds]
   */
  purgeExpired(nowSeconds = Math.floor(Date.now() / 1000)) {
    for (const [nonce, record] of this.store.entries()) {
      if (record.expiresAt <= nowSeconds) {
        this.store.delete(nonce);
      }
    }
  }

  /**
   * Consumes a nonce, ensuring it has never been used before within the validity window.
   *
   * @param {string} nonce
   * @param {string} clientPublicKey
   * @param {number} [nowSeconds]
   * @param {number} [ttlSeconds]
   * @throws {NonceReplayError} if the nonce was previously consumed and has not expired
   * @returns {{ success: boolean, nonce: string, expiresAt: number }}
   */
  consumeNonce(
    nonce,
    clientPublicKey,
    nowSeconds = Math.floor(Date.now() / 1000),
    ttlSeconds = this.defaultTtlSeconds
  ) {
    if (!nonce || typeof nonce !== "string") {
      throw new Error("Nonce must be a non-empty string");
    }

    this.purgeExpired(nowSeconds);

    const existing = this.store.get(nonce);
    if (existing && existing.expiresAt > nowSeconds) {
      throw new NonceReplayError();
    }

    const expiresAt = nowSeconds + ttlSeconds;
    this.store.set(nonce, {
      clientPublicKey: clientPublicKey || "",
      consumedAt: nowSeconds,
      expiresAt,
    });

    return {
      success: true,
      nonce,
      expiresAt,
    };
  }

  /**
   * Check if a nonce is currently consumed/locked.
   */
  isNonceUsed(nonce, nowSeconds = Math.floor(Date.now() / 1000)) {
    const record = this.store.get(nonce);
    if (!record) return false;
    return record.expiresAt > nowSeconds;
  }

  size() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }
}

// Global default singleton
const globalSep10NonceStore = new Sep10NonceStore();

module.exports = {
  Sep10NonceStore,
  NonceReplayError,
  globalSep10NonceStore,
};

