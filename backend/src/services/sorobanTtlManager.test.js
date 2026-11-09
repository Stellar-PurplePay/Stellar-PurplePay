"use strict";

const {
  checkContractTtl,
  createContractInstanceLedgerKey,
  buildExtendFootprintTtlOp,
  DEFAULT_TTL_WARNING_THRESHOLD_LEDGERS,
  SorobanTtlError,
} = require("./sorobanTtlManager");
const { StrKey } = require("@stellar/stellar-sdk");

describe("sorobanTtlManager", () => {
  const validContractId = StrKey.encodeContract(Buffer.alloc(32, 1));

  describe("createContractInstanceLedgerKey", () => {
    it("creates a valid contractData ledgerKey", () => {
      const key = createContractInstanceLedgerKey(validContractId);
      expect(key).toBeDefined();
      expect(key.switch().name).toBe("contractData");
    });

    it("throws SorobanTtlError on invalid contract ID", () => {
      expect(() => createContractInstanceLedgerKey("invalid-id")).toThrow(SorobanTtlError);
    });
  });

  describe("checkContractTtl", () => {
    it("calculates remaining ledgers and flags extension needed when below threshold", async () => {
      const mockServer = {
        getLedgerEntries: jest.fn().mockResolvedValue({
          entries: [{ liveUntilLedgerSeq: 11000 }],
        }),
        getLatestLedger: jest.fn().mockResolvedValue({ sequence: 10000 }),
      };

      const result = await checkContractTtl(mockServer, validContractId, {
        thresholdLedgers: 2000,
      });

      expect(result.remainingLedgers).toBe(1000);
      expect(result.remainingSeconds).toBe(5000);
      expect(result.needsExtension).toBe(true);
    });

    it("returns needsExtension = false when TTL is well above threshold", async () => {
      const mockServer = {
        getLedgerEntries: jest.fn().mockResolvedValue({
          entries: [{ liveUntilLedgerSeq: 100000 }],
        }),
        getLatestLedger: jest.fn().mockResolvedValue({ sequence: 10000 }),
      };

      const result = await checkContractTtl(mockServer, validContractId, {
        thresholdLedgers: 5000,
      });

      expect(result.remainingLedgers).toBe(90000);
      expect(result.needsExtension).toBe(false);
    });

    it("throws when contract entry is not found", async () => {
      const mockServer = {
        getLedgerEntries: jest.fn().mockResolvedValue({ entries: [] }),
        getLatestLedger: jest.fn().mockResolvedValue({ sequence: 10000 }),
      };

      await expect(checkContractTtl(mockServer, validContractId)).rejects.toThrow(
        /Contract instance entry not found/
      );
    });
  });

  describe("buildExtendFootprintTtlOp", () => {
    it("constructs an extendFootprintTtl operation", () => {
      const op = buildExtendFootprintTtlOp({ extendTo: 300000 });
      expect(op).toBeDefined();
      expect(op.body().arm()).toBe("extendFootprintTtlOp");
    });
  });
});
