"use strict";

const {
  validateMemoText,
  validateMemoId,
  validateMemoHash,
  validateMemoReturn,
  parseAndValidateMemo,
  MemoValidationError,
} = require("./memoValidator");

describe("memoValidator", () => {
  describe("validateMemoText", () => {
    it("accepts valid ASCII text within 28 bytes", () => {
      const memo = validateMemoText("Invoice-9942");
      expect(memo.type).toBe("text");
      expect(memo.value).toBe("Invoice-9942");
    });

    it("accepts UTF-8 text exactly at 28 bytes", () => {
      const text28 = "a".repeat(28);
      const memo = validateMemoText(text28);
      expect(memo.value).toBe(text28);
    });

    it("rejects ASCII text exceeding 28 bytes", () => {
      expect(() => validateMemoText("a".repeat(29))).toThrow(MemoValidationError);
      expect(() => validateMemoText("a".repeat(29))).toThrow(/exceeds 28-byte limit/);
    });

    it("rejects multi-byte UTF-8 string that has <= 28 characters but > 28 bytes", () => {
      // 8 emojis * 4 bytes each = 32 bytes (only 8 chars!)
      const emojiStr = "🌟".repeat(8);
      expect(emojiStr.length).toBe(16); // 8 surrogate pairs
      expect(() => validateMemoText(emojiStr)).toThrow(MemoValidationError);
    });

    it("rejects non-string input", () => {
      expect(() => validateMemoText(12345)).toThrow(MemoValidationError);
    });
  });

  describe("validateMemoId", () => {
    it("accepts numeric strings within uint64 range", () => {
      const memo = validateMemoId("18446744073709551615");
      expect(memo.type).toBe("id");
      expect(memo.value).toBe("18446744073709551615");
    });

    it("accepts zero as a valid uint64 id", () => {
      const memo = validateMemoId("0");
      expect(memo.value).toBe("0");
    });

    it("rejects negative numbers", () => {
      expect(() => validateMemoId("-1")).toThrow(MemoValidationError);
    });

    it("rejects values exceeding 2^64 - 1", () => {
      const overflow = "18446744073709551616";
      expect(() => validateMemoId(overflow)).toThrow(MemoValidationError);
    });

    it("rejects non-numeric characters", () => {
      expect(() => validateMemoId("123a45")).toThrow(MemoValidationError);
    });
  });

  describe("validateMemoHash and validateMemoReturn", () => {
    const validHex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const validBuf = Buffer.alloc(32, 0xab);

    it("accepts valid 64-char hex string for hash", () => {
      const memo = validateMemoHash(validHex);
      expect(memo.type).toBe("hash");
    });

    it("accepts valid 32-byte Buffer for hash", () => {
      const memo = validateMemoHash(validBuf);
      expect(memo.type).toBe("hash");
    });

    it("rejects hex string with incorrect length", () => {
      expect(() => validateMemoHash("abcd")).toThrow(MemoValidationError);
    });

    it("accepts valid 64-char hex for return memo", () => {
      const memo = validateMemoReturn(validHex);
      expect(memo.type).toBe("return");
    });

    it("rejects invalid buffer size for return memo", () => {
      expect(() => validateMemoReturn(Buffer.alloc(16))).toThrow(MemoValidationError);
    });
  });

  describe("parseAndValidateMemo", () => {
    it("returns MemoNone for null or none type", () => {
      expect(parseAndValidateMemo(null).type).toBe("none");
      expect(parseAndValidateMemo({ type: "none" }).type).toBe("none");
    });

    it("parses valid types correctly", () => {
      const memo = parseAndValidateMemo({ type: "text", value: "stellar payment" });
      expect(memo.type).toBe("text");
      expect(memo.value).toBe("stellar payment");
    });

    it("rejects unsupported memo types", () => {
      expect(() => parseAndValidateMemo({ type: "custom", value: "foo" })).toThrow(
        /Unsupported memo type/
      );
    });
  });
});
