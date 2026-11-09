"use strict";

const StellarTrustlineService = require("./stellarTrustlineService");

describe("StellarTrustlineService", () => {
  const accountAddress = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const issuerAddress = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

  describe("verifyTrustline for native XLM", () => {
    it("returns valid without hitting Horizon for native XLM", async () => {
      const service = new StellarTrustlineService();
      const res = await service.verifyTrustline({
        accountAddress,
        assetCode: "XLM",
      });

      expect(res.hasTrustline).toBe(true);
      expect(res.isAuthorized).toBe(true);
      expect(res.isNative).toBe(true);
      expect(res.canReceiveAmount).toBe(true);
    });
  });

  describe("verifyTrustline for non-native assets", () => {
    it("returns error if account address is invalid", async () => {
      const service = new StellarTrustlineService();
      const res = await service.verifyTrustline({
        accountAddress: "invalid",
        assetCode: "USDC",
        assetIssuer: issuerAddress,
      });

      expect(res.hasTrustline).toBe(false);
      expect(res.reason).toContain("Invalid recipient Stellar address");
    });

    it("returns error if issuer address is invalid", async () => {
      const service = new StellarTrustlineService();
      const res = await service.verifyTrustline({
        accountAddress,
        assetCode: "USDC",
        assetIssuer: "bad_issuer",
      });

      expect(res.hasTrustline).toBe(false);
      expect(res.reason).toContain("Invalid asset issuer address");
    });

    it("identifies valid trustline with sufficient capacity", async () => {
      const mockServer = {
        loadAccount: jest.fn().mockResolvedValue({
          balances: [
            { asset_type: "native", balance: "100.0" },
            {
              asset_type: "credit_alphanum4",
              asset_code: "USDC",
              asset_issuer: issuerAddress,
              balance: "250.0",
              limit: "1000.0",
              is_authorized: true,
            },
          ],
        }),
      };

      const service = new StellarTrustlineService({ server: mockServer });
      const res = await service.verifyTrustline({
        accountAddress,
        assetCode: "USDC",
        assetIssuer: issuerAddress,
        amount: "500.0",
      });

      expect(res.hasTrustline).toBe(true);
      expect(res.isAuthorized).toBe(true);
      expect(res.canReceiveAmount).toBe(true);
      expect(res.balance).toBe("250.0");
    });

    it("detects insufficient trustline capacity", async () => {
      const mockServer = {
        loadAccount: jest.fn().mockResolvedValue({
          balances: [
            {
              asset_type: "credit_alphanum4",
              asset_code: "USDC",
              asset_issuer: issuerAddress,
              balance: "900.0",
              limit: "1000.0",
              is_authorized: true,
            },
          ],
        }),
      };

      const service = new StellarTrustlineService({ server: mockServer });
      const res = await service.verifyTrustline({
        accountAddress,
        assetCode: "USDC",
        assetIssuer: issuerAddress,
        amount: "200.0",
      });

      expect(res.hasTrustline).toBe(true);
      expect(res.canReceiveAmount).toBe(false);
      expect(res.reason).toContain("Insufficient trustline capacity");
    });

    it("detects missing trustline", async () => {
      const mockServer = {
        loadAccount: jest.fn().mockResolvedValue({
          balances: [{ asset_type: "native", balance: "50.0" }],
        }),
      };

      const service = new StellarTrustlineService({ server: mockServer });
      const res = await service.verifyTrustline({
        accountAddress,
        assetCode: "USDC",
        assetIssuer: issuerAddress,
      });

      expect(res.hasTrustline).toBe(false);
      expect(res.reason).toContain("does not have a trustline");
    });

    it("detects revoked authorization", async () => {
      const mockServer = {
        loadAccount: jest.fn().mockResolvedValue({
          balances: [
            {
              asset_type: "credit_alphanum4",
              asset_code: "USDC",
              asset_issuer: issuerAddress,
              balance: "50.0",
              limit: "1000.0",
              is_authorized: false,
            },
          ],
        }),
      };

      const service = new StellarTrustlineService({ server: mockServer });
      const res = await service.verifyTrustline({
        accountAddress,
        assetCode: "USDC",
        assetIssuer: issuerAddress,
      });

      expect(res.hasTrustline).toBe(true);
      expect(res.isAuthorized).toBe(false);
      expect(res.canReceiveAmount).toBe(false);
      expect(res.reason).toContain("revoked by the issuer");
    });

    it("handles unfunded 404 account", async () => {
      const notFoundError = new Error("Not Found");
      notFoundError.name = "NotFoundError";
      const mockServer = {
        loadAccount: jest.fn().mockRejectedValue(notFoundError),
      };

      const service = new StellarTrustlineService({ server: mockServer });
      const res = await service.verifyTrustline({
        accountAddress,
        assetCode: "USDC",
        assetIssuer: issuerAddress,
      });

      expect(res.hasTrustline).toBe(false);
      expect(res.reason).toContain("not funded or does not exist");
    });
  });
});
