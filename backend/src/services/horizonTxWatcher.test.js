"use strict";

const {
  waitForTransactionConfirmation,
  TransactionTimeoutError,
} = require("./horizonTxWatcher");

describe("horizonTxWatcher", () => {
  const sampleHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  it("resolves confirmed transaction on first poll", async () => {
    const mockTx = {
      id: sampleHash,
      ledger: 123456,
      created_at: "2026-11-09T20:00:00Z",
      fee_charged: "100",
      successful: true,
      envelope_xdr: "AAAAA...",
    };

    const mockServer = {
      transactions: jest.fn().mockReturnValue({
        transaction: jest.fn().mockReturnValue({
          call: jest.fn().mockResolvedValue(mockTx),
        }),
      }),
    };

    const result = await waitForTransactionConfirmation(mockServer, sampleHash, {
      timeoutMs: 5000,
      pollIntervalMs: 10,
    });

    expect(result.confirmed).toBe(true);
    expect(result.ledger).toBe(123456);
    expect(result.successful).toBe(true);
  });

  it("polls through initial 404 and resolves when confirmed", async () => {
    const notFoundError = new Error("Not Found");
    notFoundError.response = { status: 404 };

    const mockTx = {
      ledger: 9999,
      successful: true,
      fee_charged: "200",
    };

    const mockCall = jest
      .fn()
      .mockRejectedValueOnce(notFoundError)
      .mockResolvedValueOnce(mockTx);

    const mockServer = {
      transactions: jest.fn().mockReturnValue({
        transaction: jest.fn().mockReturnValue({ call: mockCall }),
      }),
    };

    const result = await waitForTransactionConfirmation(mockServer, sampleHash, {
      timeoutMs: 5000,
      pollIntervalMs: 10,
    });

    expect(result.confirmed).toBe(true);
    expect(result.ledger).toBe(9999);
    expect(mockCall).toHaveBeenCalledTimes(2);
  });

  it("throws TransactionTimeoutError when timeout expires", async () => {
    const notFoundError = new Error("Not Found");
    notFoundError.response = { status: 404 };

    const mockServer = {
      transactions: jest.fn().mockReturnValue({
        transaction: jest.fn().mockReturnValue({
          call: jest.fn().mockRejectedValue(notFoundError),
        }),
      }),
    };

    await expect(
      waitForTransactionConfirmation(mockServer, sampleHash, {
        timeoutMs: 50,
        pollIntervalMs: 10,
      })
    ).rejects.toThrow(TransactionTimeoutError);
  });
});
