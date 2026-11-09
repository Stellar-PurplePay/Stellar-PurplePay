import { validateStellarMemo, getUtf8ByteLength } from "../utils/stellarMemoValidator";

describe("stellarMemoValidator", () => {
  it("computes accurate UTF-8 byte length including multi-byte emojis", () => {
    expect(getUtf8ByteLength("hello")).toBe(5);
    expect(getUtf8ByteLength("🛡️")).toBe(7); // Shield (4 bytes) + variation selector (3 bytes)
  });

  describe("MEMO_TEXT", () => {
    it("accepts valid ASCII within 28 bytes", () => {
      const res = validateStellarMemo("text", "escrow-payout-101");
      expect(res.isValid).toBe(true);
      expect(res.byteLength).toBe(17);
    });

    it("rejects string exceeding 28 bytes", () => {
      const res = validateStellarMemo("text", "this-memo-string-is-definitely-far-too-long-for-stellar");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("exceeds 28 bytes maximum");
    });
  });

  describe("MEMO_ID", () => {
    it("accepts valid 64-bit uint", () => {
      const res = validateStellarMemo("id", "1234567890123");
      expect(res.isValid).toBe(true);
    });

    it("rejects negative numbers or non-digits", () => {
      expect(validateStellarMemo("id", "-100").isValid).toBe(false);
      expect(validateStellarMemo("id", "12a34").isValid).toBe(false);
    });

    it("rejects numbers exceeding 64-bit max", () => {
      const tooBig = "99999999999999999999999999999999";
      const res = validateStellarMemo("id", tooBig);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("exceeds maximum 64-bit");
    });
  });

  describe("MEMO_HASH and MEMO_RETURN", () => {
    it("accepts valid 64-char hex string", () => {
      const hex = "a".repeat(64);
      expect(validateStellarMemo("hash", hex).isValid).toBe(true);
      expect(validateStellarMemo("return", hex).isValid).toBe(true);
    });

    it("rejects short or non-hex string", () => {
      expect(validateStellarMemo("hash", "short-hex").isValid).toBe(false);
      expect(validateStellarMemo("return", "g".repeat(64)).isValid).toBe(false);
    });
  });
});
