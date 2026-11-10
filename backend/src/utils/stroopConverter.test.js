"use strict";

const {
  StroopConversionError,
  xlmToStroops,
  stroopsToXlm,
  calculateFeeSplit,
} = require("./stroopConverter");

describe("stroopConverter utility", () => {
  describe("xlmToStroops", () => {
    it("converts integer XLM to stroops correctly", () => {
      expect(xlmToStroops(1)).toBe(10_000_000n);
      expect(xlmToStroops("1")).toBe(10_000_000n);
      expect(xlmToStroops("100")).toBe(1_000_000_000n);
      expect(xlmToStroops("0")).toBe(0n);
    });

    it("converts decimal XLM up to 7 decimal places with exact precision", () => {
      expect(xlmToStroops("0.1")).toBe(1_000_000n);
      expect(xlmToStroops("0.0000001")).toBe(1n); // 1 stroop
      expect(xlmToStroops("12.3456789")).toBe(123_456_789n);
      expect(xlmToStroops("999999999.9999999")).toBe(9_999_999_999_999_999n);
    });

    it("rejects invalid inputs and precision overflow", () => {
      expect(() => xlmToStroops("")).toThrow(StroopConversionError);
      expect(() => xlmToStroops(null)).toThrow(StroopConversionError);
      expect(() => xlmToStroops("abc")).toThrow(StroopConversionError);
      expect(() => xlmToStroops("-5")).toThrow(StroopConversionError);
      expect(() => xlmToStroops("1e5")).toThrow(StroopConversionError);
      // 8 decimal places exceeds Stellar max precision
      expect(() => xlmToStroops("0.00000001")).toThrow(/exceeds maximum Stellar precision/);
    });
  });

  describe("stroopsToXlm", () => {
    it("converts integer stroops to cleanly formatted XLM string", () => {
      expect(stroopsToXlm(10_000_000n)).toBe("1");
      expect(stroopsToXlm(1_000_000n)).toBe("0.1");
      expect(stroopsToXlm(1n)).toBe("0.0000001");
      expect(stroopsToXlm(123_456_789n)).toBe("12.3456789");
      expect(stroopsToXlm(0n)).toBe("0");
    });

    it("accepts string and number representations of stroops", () => {
      expect(stroopsToXlm("10000000")).toBe("1");
      expect(stroopsToXlm(50000000)).toBe("5");
    });

    it("rejects negative or invalid stroops", () => {
      expect(() => stroopsToXlm(-100n)).toThrow(StroopConversionError);
      expect(() => stroopsToXlm("invalid")).toThrow(StroopConversionError);
    });
  });

  describe("calculateFeeSplit", () => {
    it("computes fee and net payout without rounding leaks", () => {
      // 100 XLM = 1,000,000,000 stroops with 250 bps (2.5%) fee
      const gross = 1_000_000_000n;
      const { feeStroops, netStroops } = calculateFeeSplit(gross, 250);

      expect(feeStroops).toBe(25_000_000n); // 2.5 XLM
      expect(netStroops).toBe(975_000_000n); // 97.5 XLM
      expect(feeStroops + netStroops).toBe(gross);
    });

    it("handles zero fee correctly", () => {
      const gross = 500_000_000n;
      const { feeStroops, netStroops } = calculateFeeSplit(gross, 0);
      expect(feeStroops).toBe(0n);
      expect(netStroops).toBe(gross);
    });

    it("rejects invalid fee bps", () => {
      expect(() => calculateFeeSplit(100n, -1)).toThrow(StroopConversionError);
      expect(() => calculateFeeSplit(100n, 10001)).toThrow(StroopConversionError);
    });
  });
});
