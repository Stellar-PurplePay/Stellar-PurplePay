"use strict";

const StellarMuxedAccountParser = require("./stellarMuxedAccountParser");

describe("StellarMuxedAccountParser", () => {
  const baseAccount = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const subId = "987654321";

  describe("encodeMuxedAddress", () => {
    it("encodes a G-address and subAccountId into an M-address", () => {
      const mAddr = StellarMuxedAccountParser.encodeMuxedAddress(baseAccount, subId);
      expect(mAddr.startsWith("M")).toBe(true);
      expect(mAddr.length).toBe(69);
    });

    it("throws if base address is invalid", () => {
      expect(() => {
        StellarMuxedAccountParser.encodeMuxedAddress("INVALID_ADDR", subId);
      }).toThrow("Invalid base Stellar G-address");
    });

    it("throws if subAccountId is not numeric", () => {
      expect(() => {
        StellarMuxedAccountParser.encodeMuxedAddress(baseAccount, "abc");
      }).toThrow("Sub-account ID must be an unsigned integer");
    });

    it("throws if subAccountId exceeds u64", () => {
      expect(() => {
        StellarMuxedAccountParser.encodeMuxedAddress(baseAccount, "18446744073709551616");
      }).toThrow("Sub-account ID exceeds 64-bit unsigned integer range");
    });
  });

  describe("parseAddress", () => {
    it("parses a standard G-address successfully", () => {
      const result = StellarMuxedAccountParser.parseAddress(baseAccount);
      expect(result.isValid).toBe(true);
      expect(result.isMuxed).toBe(false);
      expect(result.baseAddress).toBe(baseAccount);
      expect(result.subAccountId).toBeNull();
    });

    it("parses a valid M-address into baseAddress and subAccountId", () => {
      const mAddr = StellarMuxedAccountParser.encodeMuxedAddress(baseAccount, subId);
      const result = StellarMuxedAccountParser.parseAddress(mAddr);

      expect(result.isValid).toBe(true);
      expect(result.isMuxed).toBe(true);
      expect(result.baseAddress).toBe(baseAccount);
      expect(result.subAccountId).toBe(subId);
    });

    it("parses boundary subAccountId 0", () => {
      const mAddr = StellarMuxedAccountParser.encodeMuxedAddress(baseAccount, "0");
      const result = StellarMuxedAccountParser.parseAddress(mAddr);
      expect(result.isValid).toBe(true);
      expect(result.subAccountId).toBe("0");
    });

    it("returns error for invalid address strings", () => {
      const result = StellarMuxedAccountParser.parseAddress("not-an-address");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid Stellar address format");
    });

    it("returns error for empty input", () => {
      const result = StellarMuxedAccountParser.parseAddress("");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("non-empty string");
    });
  });

  describe("type checkers", () => {
    it("isMuxedAddress accurately identifies M addresses", () => {
      const mAddr = StellarMuxedAccountParser.encodeMuxedAddress(baseAccount, "1");
      expect(StellarMuxedAccountParser.isMuxedAddress(mAddr)).toBe(true);
      expect(StellarMuxedAccountParser.isMuxedAddress(baseAccount)).toBe(false);
    });

    it("isBaseAddress accurately identifies G addresses", () => {
      const mAddr = StellarMuxedAccountParser.encodeMuxedAddress(baseAccount, "1");
      expect(StellarMuxedAccountParser.isBaseAddress(baseAccount)).toBe(true);
      expect(StellarMuxedAccountParser.isBaseAddress(mAddr)).toBe(false);
    });
  });
});
