"use strict";

const {
  isArchivedEntryError,
  buildRestoreFootprintOperation,
  restoreContractInstance,
  SorobanRestoreError,
} = require("./sorobanRestoreManager");
const { Keypair, Networks, StrKey } = require("@stellar/stellar-sdk");

describe("sorobanRestoreManager", () => {
  const sourceKeypair = Keypair.random();
  const contractId = StrKey.encodeContract(Buffer.alloc(32, 2));

  describe("isArchivedEntryError", () => {
    it("detects archived entry error phrases", () => {
      expect(isArchivedEntryError("HostError: EntryArchived")).toBe(true);
      expect(isArchivedEntryError(new Error("Storage, MissingValue"))).toBe(true);
      expect(isArchivedEntryError(new Error("Connection reset"))).toBe(false);
    });
  });

  describe("buildRestoreFootprintOperation", () => {
    it("builds restoreFootprint operation", () => {
      const op = buildRestoreFootprintOperation();
      expect(op.body().arm()).toBe("restoreFootprintOp");
    });
  });

  describe("restoreContractInstance", () => {
    it("simulates, signs, and sends transaction", async () => {
      const mockAccount = {
        accountId: () => sourceKeypair.publicKey(),
        sequenceNumber: () => "100",
        incrementSequenceNumber: jest.fn(),
      };

      const mockTx = {
        toXDR: () => "AAAAA...",
        sign: jest.fn(),
      };

      const mockServer = {
        getAccount: jest.fn().mockResolvedValue(mockAccount),
        simulateTransaction: jest.fn().mockResolvedValue({
          assembledTransactionXDR: "AAAA...",
        }),
        sendTransaction: jest.fn().mockResolvedValue({ hash: "tx-restored-hash", status: "PENDING" }),
      };

      // Mock fromXDR to return mockTx
      const { TransactionBuilder } = require("@stellar/stellar-sdk");
      jest.spyOn(TransactionBuilder, "fromXDR").mockReturnValue(mockTx);

      const res = await restoreContractInstance({
        server: mockServer,
        sourceKeypair,
        contractId,
        networkPassphrase: Networks.TESTNET,
      });

      expect(res.hash).toBe("tx-restored-hash");
      expect(mockServer.simulateTransaction).toHaveBeenCalledTimes(1);
      expect(mockServer.sendTransaction).toHaveBeenCalledTimes(1);

      TransactionBuilder.fromXDR.mockRestore();
    });

    it("throws SorobanRestoreError when simulation fails", async () => {
      const mockAccount = {
        accountId: () => sourceKeypair.publicKey(),
        sequenceNumber: () => "100",
        incrementSequenceNumber: jest.fn(),
      };

      const mockServer = {
        getAccount: jest.fn().mockResolvedValue(mockAccount),
        simulateTransaction: jest.fn().mockResolvedValue({
          error: "Footprint exceeds maximum restoration budget",
        }),
      };

      await expect(
        restoreContractInstance({
          server: mockServer,
          sourceKeypair,
          contractId,
          networkPassphrase: Networks.TESTNET,
        })
      ).rejects.toThrow(SorobanRestoreError);
    });
  });
});
