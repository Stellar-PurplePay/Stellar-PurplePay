"use strict";

const express = require("express");
const request = require("supertest");
const receiptRoutes = require("./receiptRoutes");

describe("receiptRoutes", () => {
  let app;
  const validClient = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const validFreelancer = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
  const validTxHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/api/stellar/receipts", receiptRoutes);
  });

  it("generates receipt on valid POST /generate", async () => {
    const res = await request(app)
      .post("/api/stellar/receipts/generate")
      .send({
        receiptId: 10,
        txHash: validTxHash,
        jobId: "job-101",
        clientAddress: validClient,
        freelancerAddress: validFreelancer,
        amount: "50.0",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.receiptSerial).toBe("RCP-STLR-00000010");
    expect(res.body.data.digest).toBeDefined();
  });

  it("verifies receipt integrity on POST /verify", async () => {
    // Generate valid receipt first
    const genRes = await request(app)
      .post("/api/stellar/receipts/generate")
      .send({
        receiptId: 20,
        txHash: validTxHash,
        jobId: "job-200",
        clientAddress: validClient,
        freelancerAddress: validFreelancer,
        amount: "100.0",
        timestamp: 1700000000,
      });

    const receipt = genRes.body.data;

    // Verify it
    const verifyRes = await request(app)
      .post("/api/stellar/receipts/verify")
      .send({ receipt });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.isValid).toBe(true);
  });

  it("returns 400 when missing required fields", async () => {
    const res = await request(app)
      .post("/api/stellar/receipts/generate")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
