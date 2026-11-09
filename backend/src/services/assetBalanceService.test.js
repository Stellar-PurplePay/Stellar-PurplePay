"use strict";

const {
  parseAccountBalances,
  findAssetBalance,
  hasSufficientSpendableBalance,
  getAssetIdentifier,
  AssetBalanceError,
} = require("./assetBalanceService");
const { Asset } = require("@stellar/stellar-sdk");

describe("assetBalanceService", () => {
  const sampleIssuer = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
  const mockAccount = {
    subentry_count: 2,
    balances: [
      {
        asset_type: "native",
        balance: "100.0000000",
        selling_liabilities: "5.0000000",
        buying_liabilities: "0.0000000",
      },
      {
        asset_type: "credit_alphanum4",
        asset_code: "USDC",
        asset_issuer: sampleIssuer,
        balance: "50.5000000",
        selling_liabilities: "10.0000000",
        buying_liabilities: "0.0000000",
        limit: "1000000.0000000",
        is_authorized: true,
      },
      {
        asset_type: "liquidity_pool_shares",
        liquidity_pool_id: "lp_abcdef123456",
        balance: "12.3456789",
        limit: "922337203685.4775807",
      },
    ],
  };

  describe("parseAccountBalances", () => {
    it("computes spendable XLM taking reserve and liabilities into account", () => {
      // Subentries = 2 -> Reserve = (2 + 2) * 0.5 = 2.0 XLM
      // Balance = 100, Selling Liabilities = 5
      // Spendable = 100 - 2.0 - 5 = 93.0 XLM
      const balances = parseAccountBalances(mockAccount);
      const native = balances.find((b) => b.assetType === "native");
      expect(native.balance).toBe(100);
      expect(native.spendableBalance).toBe(93);
    });

    it("computes spendable non-native asset subtracting selling liabilities", () => {
      const balances = parseAccountBalances(mockAccount);
      const usdc = balances.find((b) => b.assetCode === "USDC");
      expect(usdc.balance).toBe(50.5);
      expect(usdc.spendableBalance).toBe(40.5); // 50.5 - 10
    });

    it("throws on missing balances array", () => {
      expect(() => parseAccountBalances({})).toThrow(AssetBalanceError);
    });
  });

  describe("findAssetBalance", () => {
    it("finds native balance by string 'native' or Asset.native()", () => {
      const b1 = findAssetBalance(mockAccount, "native");
      const b2 = findAssetBalance(mockAccount, Asset.native());
      expect(b1).toBeDefined();
      expect(b2).toBeDefined();
      expect(b1.assetCode).toBe("XLM");
    });

    it("finds credit asset by Asset object", () => {
      const usdcAsset = new Asset("USDC", sampleIssuer);
      const found = findAssetBalance(mockAccount, usdcAsset);
      expect(found).toBeDefined();
      expect(found.assetCode).toBe("USDC");
    });
  });

  describe("hasSufficientSpendableBalance", () => {
    it("returns true when spendable balance is sufficient", () => {
      expect(hasSufficientSpendableBalance(mockAccount, "native", 50)).toBe(true);
      expect(hasSufficientSpendableBalance(mockAccount, `USDC:${sampleIssuer}`, 30)).toBe(true);
    });

    it("returns false when requested amount exceeds spendable", () => {
      expect(hasSufficientSpendableBalance(mockAccount, "native", 95)).toBe(false);
      expect(hasSufficientSpendableBalance(mockAccount, `USDC:${sampleIssuer}`, 45)).toBe(false);
    });

    it("returns false for nonexistent trustline", () => {
      expect(hasSufficientSpendableBalance(mockAccount, `XYZ:${sampleIssuer}`, 10)).toBe(false);
    });
  });
});
