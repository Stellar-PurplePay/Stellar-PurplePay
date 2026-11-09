"use strict";

const {
  getBestStrictReceiveQuote,
  getBestStrictSendQuote,
  PathPaymentError,
} = require("./pathPaymentService");
const { Asset, Keypair } = require("@stellar/stellar-sdk");

describe("pathPaymentService", () => {
  const issuer = Keypair.random().publicKey();
  const usdc = new Asset("USDC", issuer);
  const destinationAddress = Keypair.random().publicKey();

  describe("getBestStrictReceiveQuote", () => {
    it("selects lowest source_amount path and applies slippage to sendMax", async () => {
      const mockRecords = [
        {
          source_asset_type: "native",
          source_amount: "15.0000000",
          destination_amount: "10.0000000",
          path: [],
        },
        {
          source_asset_type: "native",
          source_amount: "12.0000000", // Cheaper path
          destination_amount: "10.0000000",
          path: [],
        },
      ];

      const mockServer = {
        strictReceivePaths: jest.fn().mockReturnValue({
          call: jest.fn().mockResolvedValue({ records: mockRecords }),
        }),
      };

      const quote = await getBestStrictReceiveQuote(mockServer, {
        sourceAccountOrAsset: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        destinationAsset: usdc,
        destinationAmount: "10.0000000",
        maxSlippagePercent: 1.0,
      });

      expect(quote.nominalSourceAmount).toBe("12");
      // 12 * 1.01 = 12.12
      expect(parseFloat(quote.sendMax)).toBeCloseTo(12.12, 2);

      const op = quote.buildOperation(destinationAddress);
      expect(op.body().arm()).toBe("pathPaymentStrictReceiveOp");
    });

    it("throws when no paths found", async () => {
      const mockServer = {
        strictReceivePaths: jest.fn().mockReturnValue({
          call: jest.fn().mockResolvedValue({ records: [] }),
        }),
      };

      await expect(
        getBestStrictReceiveQuote(mockServer, {
          sourceAccountOrAsset: "G123",
          destinationAsset: usdc,
          destinationAmount: "10",
        })
      ).rejects.toThrow(PathPaymentError);
    });
  });

  describe("getBestStrictSendQuote", () => {
    it("selects highest destination_amount path and applies slippage to destMin", async () => {
      const mockRecords = [
        {
          source_asset_type: "native",
          destination_asset_type: "credit_alphanum4",
          destination_asset_code: "USDC",
          destination_asset_issuer: issuer,
          destination_amount: "8.5000000",
          path: [],
        },
        {
          source_asset_type: "native",
          destination_asset_type: "credit_alphanum4",
          destination_asset_code: "USDC",
          destination_asset_issuer: issuer,
          destination_amount: "9.2000000", // Highest yield
          path: [],
        },
      ];

      const mockServer = {
        strictSendPaths: jest.fn().mockReturnValue({
          call: jest.fn().mockResolvedValue({ records: mockRecords }),
        }),
      };

      const quote = await getBestStrictSendQuote(mockServer, {
        sourceAsset: Asset.native(),
        sourceAmount: "10.0000000",
        destinationAccountOrAssets: [usdc],
        maxSlippagePercent: 2.0,
      });

      expect(quote.nominalDestAmount).toBe("9.2");
      // 9.2 * (1 - 0.02) = 9.016
      expect(parseFloat(quote.destMin)).toBeCloseTo(9.016, 2);

      const op = quote.buildOperation(destinationAddress);
      expect(op.body().arm()).toBe("pathPaymentStrictSendOp");
    });
  });
});
