"use strict";

const express = require("express");
const request = require("supertest");
const transactionQueryRoutes = require("./transactionQueryRoutes");
const { StellarTransactionFetcher } = require("../services/stellarTransactionFetcher");

jest.mock("../services/stellarTransactionFetcher");

describe("Transaction Query Routes - GET /api/stellar/transactions/:hash", () => {
  let app;
  const validHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  beforeEach(() => {
    jest.clearAllMocks();

    StellarTransactionFetcher.prototype.isValidTxHash.mockImplementation((hash) => {
      return /^[0-9a-fA-F]{64}$/.test(hash);
    });

    app = express();
    app.use(express.json());
    app.use("/api/stellar/transactions", transactionQueryRoutes);
  });

  it("returns 400 when hash has invalid format", async () => {
    const res = await request(app).get("/api/stellar/transactions/short-hash");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_TX_HASH");
  });

  it("returns 200 with details on valid transaction", async () => {
    const mockDetails = {
      hash: validHash,
      successful: true,
      ledger: 1000,
      feeCharged: { stroops: 100, xlm: "0.0000100" },
      operations: [],
    };

    StellarTransactionFetcher.prototype.getTransactionDetails.mockResolvedValue(mockDetails);

    const res = await request(app).get(`/api/stellar/transactions/${validHash}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(mockDetails);
  });

  it("returns 404 when transaction is not found", async () => {
    const notFoundError = new Error("Transaction not found");
    notFoundError.code = "TRANSACTION_NOT_FOUND";
    notFoundError.status = 404;

    StellarTransactionFetcher.prototype.getTransactionDetails.mockRejectedValue(notFoundError);

    const res = await request(app).get(`/api/stellar/transactions/${validHash}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("TRANSACTION_NOT_FOUND");
  });

  it("returns 500 when transaction lookup encounters internal error", async () => {
    StellarTransactionFetcher.prototype.getTransactionDetails.mockRejectedValue(
      new Error("Horizon timeout")
    );

    const res = await request(app).get(`/api/stellar/transactions/${validHash}`);
    expect(res.status).toBe(500);
    expect(res.body.code).toBe("TRANSACTION_QUERY_FAILED");
  });
});
