"use strict";

const { validateMemo } = require("./stellarMemoSchema");

describe("stellarMemoSchema", () => {
  describe("MEMO_NONE", () => {
    it("accepts none with empty value", () => {
      const res = validateMemo({ type: "none", value: "" });
      expect(res.success).toBe(true);
      expect(res.data.type).toBe("none");
    });

    it("accepts none without value property", () => {
      const res = validateMemo({ type: "none" });
      expect(res.success).toBe(true);
    });
  });

  describe("MEMO_TEXT", () => {
    it("accepts ASCII text up to 28 bytes", () => {
      const res = validateMemo({ type: "text", value: "Invoice 12345" });
      expect(res.success).toBe(true);
    });

    it("accepts exact 28-byte string", () => {
      const exactly28 = "1234567890123456789012345678";
      expect(Buffer.byteLength(exactly28, "utf8")).toBe(28);
      const res = validateMemo({ type: "text", value: exactly28 });
      expect(res.success).toBe(true);
    });

    it("rejects ASCII text exceeding 28 bytes", () => {
      const string29 = "12345678901234567890123456789";
      const res = validateMemo({ type: "text", value: string29 });
      expect(res.success).toBe(false);
      expect(res.error).toContain("exceeds 28 bytes maximum");
    });

    it("correctly measures multi-byte UTF-8 emojis", () => {
      // 🛡️ = 7 bytes in UTF-8
      const fourShields = "🛡️🛡️🛡️🛡️"; // 28 bytes
      expect(Buffer.byteLength(fourShields, "utf8")).toBe(28);
      const validRes = validateMemo({ type: "text", value: fourShields });
      expect(validRes.success).toBe(true);

      const fiveShields = "🛡️🛡️🛡️🛡️🛡️"; // 35 bytes
      const invalidRes = validateMemo({ type: "text", value: fiveShields });
      expect(invalidRes.success).toBe(false);
    });
  });

  describe("MEMO_ID", () => {
    it("accepts valid uint64 digit string", () => {
      const res = validateMemo({ type: "id", value: "18446744073709551615" });
      expect(res.success).toBe(true);
    });

    it("accepts 0 as ID", () => {
      const res = validateMemo({ type: "id", value: "0" });
      expect(res.success).toBe(true);
    });

    it("rejects non-digit strings", () => {
      const res = validateMemo({ type: "id", value: "not-a-number" });
      expect(res.success).toBe(false);
      expect(res.error).toContain("must be an unsigned 64-bit integer digit string");
    });

    it("rejects negative numbers", () => {
      const res = validateMemo({ type: "id", value: "-100" });
      expect(res.success).toBe(false);
    });

    it("rejects values exceeding uint64 max", () => {
      const overflow = "18446744073709551616"; // 2^64
      const res = validateMemo({ type: "id", value: overflow });
      expect(res.success).toBe(false);
      expect(res.error).toContain("boundary");
    });

    it("rejects empty id string", () => {
      const res = validateMemo({ type: "id", value: "" });
      expect(res.success).toBe(false);
    });
  });

  describe("MEMO_HASH and MEMO_RETURN", () => {
    const validHex32 = "a".repeat(64);

    it("accepts 64-char hex string for hash", () => {
      const res = validateMemo({ type: "hash", value: validHex32 });
      expect(res.success).toBe(true);
    });

    it("accepts 64-char hex string for return", () => {
      const res = validateMemo({ type: "return", value: validHex32 });
      expect(res.success).toBe(true);
    });

    it("rejects invalid length hex string for hash", () => {
      const res = validateMemo({ type: "hash", value: "abcdef" });
      expect(res.success).toBe(false);
      expect(res.error).toContain("valid 32-byte hexadecimal string");
    });

    it("rejects non-hex characters", () => {
      const nonHex = "z".repeat(64);
      const res = validateMemo({ type: "hash", value: nonHex });
      expect(res.success).toBe(false);
    });
  });

  describe("Invalid types", () => {
    it("rejects unsupported memo types", () => {
      const res = validateMemo({ type: "unknown", value: "123" });
      expect(res.success).toBe(false);
    });
  });
});
