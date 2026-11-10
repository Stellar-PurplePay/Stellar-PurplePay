"use strict";

const { Sep10NonceStore, NonceReplayError } = require("./sep10NonceStore");

describe("Sep10NonceStore", () => {
  let store;

  beforeEach(() => {
    store = new Sep10NonceStore({ defaultTtlSeconds: 300 });
  });

  it("consumes a unique nonce successfully", () => {
    const nonce = "random-nonce-123";
    const res = store.consumeNonce(nonce, "GCLIENT1", 1000);

    expect(res.success).toBe(true);
    expect(res.nonce).toBe(nonce);
    expect(res.expiresAt).toBe(1300);
    expect(store.isNonceUsed(nonce, 1000)).toBe(true);
  });

  it("throws NonceReplayError when trying to consume an active nonce twice", () => {
    const nonce = "replay-nonce-456";
    store.consumeNonce(nonce, "GCLIENT1", 1000);

    expect(() => store.consumeNonce(nonce, "GCLIENT1", 1050)).toThrow(
      NonceReplayError
    );
  });

  it("purges expired nonces and allows reuse after TTL", () => {
    const nonce = "expired-nonce-789";
    store.consumeNonce(nonce, "GCLIENT1", 1000, 300); // expires at 1300

    expect(store.isNonceUsed(nonce, 1299)).toBe(true);

    // After expiry at 1301:
    expect(store.isNonceUsed(nonce, 1301)).toBe(false);

    // Can be consumed again without throwing
    const res = store.consumeNonce(nonce, "GCLIENT1", 1301, 300);
    expect(res.success).toBe(true);
    expect(res.expiresAt).toBe(1601);
  });

  it("rejects invalid or empty nonce input", () => {
    expect(() => store.consumeNonce("", "GCLIENT1")).toThrow(
      /Nonce must be a non-empty string/
    );
    expect(() => store.consumeNonce(null, "GCLIENT1")).toThrow(
      /Nonce must be a non-empty string/
    );
  });
});

