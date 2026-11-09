"use strict";

const express = require("express");
const request = require("supertest");
const trustlineRoutes = require("./trustlineRoutes");
const StellarTrustlineService = require("../services/stellarTrustlineService");

jest.mock("../services/stellarTrustlineService");

describe("trustlineRoutes", () => {
  let app;
  const mockAccount = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const mockIssuer = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/api/stellar/trustlines", trustlineRoutes);
    jest.clearAllMocks();
  });

  describe("GET /api/stellar/trustlines/verify", () => {
    it("returns 400 if accountAddress is missing", async () => {
      const res = await request(app).get("/api/stellar/trustlines/verify");
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("accountAddress' is required");
    });

    it("returns 200 with trustline details on valid request", async () => {
      StellarTrustlineService.prototype.verifyTrustline.mockResolvedValueOnce({
        hasTrustline: true,
        isAuthorized: true,
        isNative: false,
        balance: "50.0",
        limit: "1000.0",
        canReceiveAmount: true,
      });

      const res = await request(app)
        .get("/api/stellar/trustlines/verify")
        .query({
          accountAddress: mockAccount,
          assetCode: "USDC",
          assetIssuer: mockIssuer,
          amount: "100.0",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hasTrustline).toBe(true);
      expect(res.body.data.canReceiveAmount).toBe(true);
    });
  });

  describe("POST /api/stellar/trustlines/verify", () => {
    it("returns 400 if accountAddress is missing in body", async () => {
      const res = await request(app)
        .post("/api/stellar/trustlines/verify")
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("accountAddress' is required");
    });

    it("returns 200 on valid body request", async () => {
      StellarTrustlineService.prototype.verifyTrustline.mockResolvedValueOnce({
        hasTrustline: false,
        isAuthorized: false,
        isNative: false,
        balance: "0",
        limit: "0",
        canReceiveAmount: false,
        reason: "No trustline found",
      });

      const res = await request(app)
        .post("/api/stellar/trustlines/verify")
        .send({
          accountAddress: mockAccount,
          assetCode: "USDC",
          assetIssuer: mockIssuer,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hasTrustline).toBe(false);
      expect(res.body.data.reason).toBe("No trustline found");
    });
  });
});
