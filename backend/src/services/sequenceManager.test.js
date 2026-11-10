"use strict";

const {
  isBadSequenceError,
  submitWithSequenceRetry,
} = require("./sequenceManager");
const { Keypair } = require("@stellar/stellar-sdk");

describe("sequenceManager", () => {
  const keypair = Keypair.random();

  describe("isBadSequenceError", () => {
    it("returns true for response containing tx_bad_seq", () => {
      const error = {
        response: {
          data: {
            extras: {
              result_codes: { transaction: "tx_bad_seq" },
            },
          },
        },
      };
      expect(isBadSequenceError(error)).toBe(true);
    });

    it("returns true for message containing tx_bad_seq", () => {
      expect(isBadSequenceError(new Error("Transaction failed with tx_bad_seq"))).toBe(true);
    });

    it("returns false for other errors", () => {
      expect(isBadSequenceError(new Error("Network timeout"))).toBe(false);
      expect(isBadSequenceError(null)).toBe(false);
    });
  });

  describe("submitWithSequenceRetry", () => {
    it("submits on first attempt when no error occurs", async () => {
      const mockAccount = { accountId: () => keypair.publicKey(), sequence: "100" };
      const mockServer = {
        loadAccount: jest.fn().mockResolvedValue(mockAccount),
        submitTransaction: jest.fn().mockResolvedValue({ hash: "txhash123", successful: true }),
      };
      const buildTx = jest.fn().mockResolvedValue({ xdr: "tx-xdr" });

      const res = await submitWithSequenceRetry(mockServer, keypair, buildTx);

      expect(res.hash).toBe("txhash123");
      expect(mockServer.loadAccount).toHaveBeenCalledTimes(1);
      expect(mockServer.submitTransaction).toHaveBeenCalledTimes(1);
    });

    it("retries on tx_bad_seq and succeeds on subsequent attempt", async () => {
      const badSeqError = new Error("tx_bad_seq");
      badSeqError.response = {
        data: { extras: { result_codes: { transaction: "tx_bad_seq" } } },
      };

      const mockAccount1 = { accountId: () => keypair.publicKey(), sequence: "100" };
      const mockAccount2 = { accountId: () => keypair.publicKey(), sequence: "101" };

      const mockServer = {
        loadAccount: jest
          .fn()
          .mockResolvedValueOnce(mockAccount1)
          .mockResolvedValueOnce(mockAccount2),
        submitTransaction: jest
          .fn()
          .mockRejectedValueOnce(badSeqError)
          .mockResolvedValueOnce({ hash: "recovered-hash", successful: true }),
      };

      const buildTx = jest.fn().mockResolvedValue({ xdr: "fresh-tx-xdr" });

      const res = await submitWithSequenceRetry(mockServer, keypair, buildTx, { maxRetries: 3 });

      expect(res.hash).toBe("recovered-hash");
      expect(mockServer.loadAccount).toHaveBeenCalledTimes(2);
      expect(mockServer.submitTransaction).toHaveBeenCalledTimes(2);
    });

    it("throws non-sequence error immediately without retrying", async () => {
      const fatalError = new Error("tx_insufficient_balance");
      const mockServer = {
        loadAccount: jest.fn().mockResolvedValue({}),
        submitTransaction: jest.fn().mockRejectedValue(fatalError),
      };

      await expect(
        submitWithSequenceRetry(mockServer, keypair, () => Promise.resolve({}))
      ).rejects.toThrow("tx_insufficient_balance");

      expect(mockServer.loadAccount).toHaveBeenCalledTimes(1);
    });
  });
});
