"use strict";

const express = require("express");
const request = require("supertest");
const federationRoutes = require("./federationRoutes");
const stellarFederationService = require("../services/stellarFederationService");

jest.mock("../services/stellarFederationService");

describe("federationRoutes", () => {
  let app;
  const validG = "GCGQCFTEFE4W5BNG2QXJN4244ZCQMGLO6G5X65NILEKVLGZTSNZUVHJP";

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/stellar/federation", federationRoutes);
  });

  describe("GET /api/stellar/federation/resolve", () => {
    it("returns 400 for missing address", async () => {
      const res = await request(app).get("/api/stellar/federation/resolve");
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid or missing 'address'");
    });

    it("returns 200 and resolved address data on success", async () => {
      stellarFederationService.FEDERATION_PATTERN = /^([a-zA-Z0-9._%+-]+)\*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;
      stellarFederationService.resolveFederatedAddress.mockResolvedValue({
        account_id: validG,
        memo_type: "text",
        memo: "escrow-payout",
      });

      const res = await request(app)
        .get("/api/stellar/federation/resolve")
        .query({ address: "alice*stellar.org" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.account_id).toBe(validG);
    });

    it("returns 502 when resolution service throws", async () => {
      stellarFederationService.FEDERATION_PATTERN = /^([a-zA-Z0-9._%+-]+)\*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;
      stellarFederationService.resolveFederatedAddress.mockRejectedValue(
        new Error("Server unreachable")
      );

      const res = await request(app)
        .get("/api/stellar/federation/resolve")
        .query({ address: "alice*stellar.org" });

      expect(res.status).toBe(502);
      expect(res.body.error).toBe("Server unreachable");
    });
  });

  describe("GET /api/stellar/federation/reverse", () => {
    it("returns 400 for invalid account_id", async () => {
      const res = await request(app)
        .get("/api/stellar/federation/reverse")
        .query({ account_id: "invalid_key", server: "https://example.com" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid or missing 'account_id'");
    });

    it("returns 200 on successful reverse lookup", async () => {
      stellarFederationService.reverseResolveFederatedAddress.mockResolvedValue({
        stellar_address: "alice*stellar.org",
      });

      const res = await request(app)
        .get("/api/stellar/federation/reverse")
        .query({ account_id: validG, server: "https://example.com" });

      expect(res.status).toBe(200);
      expect(res.body.data.stellar_address).toBe("alice*stellar.org");
    });
  });
});
