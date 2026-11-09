"use strict";

const {
  executeBatchPayments,
  chunkArray,
  validatePaymentItems,
  BatchPaymentError,
} = require("./batchPaymentService");
const { Keypair, Account, Networks } = require("@stellar/stellar-sdk");

describe("batchPaymentService", () => {
  const sourceKeypair = Keypair.random();
  const dest1 = Keypair.random().publicKey();
  const dest2 = Keypair.random().publicKey();
  const dest3 = Keypair.random().publicKey();

  describe("chunkArray", () => {
    it("chunks array into groups of specified size", () => {
      const items = [1, 2, 3, 4, 5];
      const chunks = chunkArray(items, 2);
      expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
    });
  });

  describe("validatePaymentItems", () => {
    it("validates valid payment items", () => {
      expect(() =>
        validatePaymentItems([{ destination: dest1, amount: "10.5" }])
      ).not.toThrow();
    });

    it("throws on invalid destination or non-positive amount", () => {
      expect(() =>
        validatePaymentItems([{ destination: "bad-dest", amount: "10" }])
      ).toThrow(/Invalid destination/);

      expect(() =>
        validatePaymentItems([{ destination: dest1, amount: "-5" }])
      ).toThrow(/must be a positive number/);
    });
  });

  describe("executeBatchPayments", () => {
    it("chunks payments and submits multiple transactions sequentially", async () => {
      const payments = [
        { destination: dest1, amount: "1.0" },
        { destination: dest2, amount: "2.0" },
        { destination: dest3, amount: "3.0" },
      ];

      const mockAccount = new Account(sourceKeypair.publicKey(), "100");

      const mockServer = {
        loadAccount: jest.fn().mockResolvedValue(mockAccount),
        submitTransaction: jest
          .fn()
          .mockResolvedValueOnce({ hash: "tx-chunk-0" })
          .mockResolvedValueOnce({ hash: "tx-chunk-1" }),
      };

      const res = await executeBatchPayments({
        payments,
        sourceKeypair,
        horizonServer: mockServer,
        networkPassphrase: Networks.TESTNET,
        maxOpsPerChunk: 2, // 3 payments -> 2 chunks: [2, 1]
      });

      expect(res.successfulChunks).toBe(2);
      expect(res.totalPayments).toBe(3);
      expect(res.txHashes).toEqual(["tx-chunk-0", "tx-chunk-1"]);
      expect(mockServer.submitTransaction).toHaveBeenCalledTimes(2);
    });

    it("records partial progress in BatchPaymentError when a chunk fails", async () => {
      const payments = [
        { destination: dest1, amount: "1.0" },
        { destination: dest2, amount: "2.0" },
      ];

      const mockAccount = new Account(sourceKeypair.publicKey(), "100");

      const mockServer = {
        loadAccount: jest.fn().mockResolvedValue(mockAccount),
        submitTransaction: jest
          .fn()
          .mockResolvedValueOnce({ hash: "tx-chunk-0" })
          .mockRejectedValueOnce(new Error("tx_insufficient_fee")),
      };

      try {
        await executeBatchPayments({
          payments,
          sourceKeypair,
          horizonServer: mockServer,
          networkPassphrase: Networks.TESTNET,
          maxOpsPerChunk: 1, // 2 chunks
        });
        throw new Error("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(BatchPaymentError);
        expect(err.report.successfulChunks).toBe(1);
        expect(err.report.failedChunkIndex).toBe(1);
        expect(err.report.txHashes).toEqual(["tx-chunk-0"]);
      }
    });
  });
});
