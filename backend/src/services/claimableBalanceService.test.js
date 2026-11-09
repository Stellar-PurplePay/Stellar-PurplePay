"use strict";

const {
  buildCreateClaimableBalanceOperation,
  buildClaimClaimableBalanceOperation,
  ClaimableBalanceError,
} = require("./claimableBalanceService");
const { Asset, Claimant, Keypair } = require("@stellar/stellar-sdk");

describe("claimableBalanceService", () => {
  const claimant1 = Keypair.random().publicKey();
  const sampleBalanceId = "00000000" + "ab".repeat(32);

  describe("buildCreateClaimableBalanceOperation", () => {
    it("creates operation with unconditional claimant by default", () => {
      const op = buildCreateClaimableBalanceOperation({
        asset: Asset.native(),
        amount: "50.0",
        claimants: [{ destination: claimant1 }],
      });

      expect(op.body().arm()).toBe("createClaimableBalanceOp");
    });

    it("creates operation with time-predicate claimant", () => {
      const timePredicate = Claimant.predicateBeforeAbsoluteTime("1800000000");
      const op = buildCreateClaimableBalanceOperation({
        asset: Asset.native(),
        amount: "100.0",
        claimants: [{ destination: claimant1, predicate: timePredicate }],
      });

      expect(op.body().arm()).toBe("createClaimableBalanceOp");
    });

    it("rejects non-positive amount or missing claimants", () => {
      expect(() =>
        buildCreateClaimableBalanceOperation({
          asset: Asset.native(),
          amount: "0",
          claimants: [{ destination: claimant1 }],
        })
      ).toThrow(ClaimableBalanceError);

      expect(() =>
        buildCreateClaimableBalanceOperation({
          asset: Asset.native(),
          amount: "10",
          claimants: [],
        })
      ).toThrow(ClaimableBalanceError);
    });
  });

  describe("buildClaimClaimableBalanceOperation", () => {
    it("creates claim operation with valid balance ID", () => {
      const op = buildClaimClaimableBalanceOperation({ balanceId: sampleBalanceId });
      expect(op.body().arm()).toBe("claimClaimableBalanceOp");
    });

    it("rejects invalid balance ID", () => {
      expect(() => buildClaimClaimableBalanceOperation({ balanceId: "short" })).toThrow(
        ClaimableBalanceError
      );
    });
  });
});
