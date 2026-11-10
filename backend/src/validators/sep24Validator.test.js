"use strict";

const {
  sep24DepositInteractiveSchema,
  sep24InfoResponseSchema,
} = require("./sep24Validator");
const { Keypair } = require("@stellar/stellar-sdk");

describe("sep24Validator", () => {
  const validAccount = Keypair.random().publicKey();

  describe("sep24DepositInteractiveSchema", () => {
    it("validates compliant SEP-24 interactive deposit request", () => {
      const validPayload = {
        asset_code: "USDC",
        account: validAccount,
        amount: "150.50",
        claimable_balance_supported: true,
        wallet_name: "PurplePay Freelance",
        wallet_url: "https://purplepay.org",
      };

      const result = sep24DepositInteractiveSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects invalid Stellar account key", () => {
      const invalid = {
        asset_code: "USDC",
        account: "not-a-stellar-account",
      };
      const result = sep24DepositInteractiveSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain("Invalid Stellar public key");
    });

    it("rejects amount with more than 7 decimal places", () => {
      const invalid = {
        asset_code: "USDC",
        account: validAccount,
        amount: "10.12345678", // 8 decimals
      };
      const result = sep24DepositInteractiveSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("sep24InfoResponseSchema", () => {
    it("validates anchor info response with deposit and withdraw configs", () => {
      const infoPayload = {
        deposit: {
          USDC: {
            enabled: true,
            min_amount: 1,
            max_amount: 10000,
            fee_fixed: 0.5,
          },
        },
        withdraw: {
          USDC: {
            enabled: true,
            min_amount: 5,
            fee_percent: 0.1,
          },
        },
      };

      const result = sep24InfoResponseSchema.safeParse(infoPayload);
      expect(result.success).toBe(true);
    });
  });
});
