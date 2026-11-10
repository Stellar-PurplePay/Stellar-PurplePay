"use strict";

const {
  evaluateAccountMergeEligibility,
  buildAccountMergeOperation,
} = require("./accountMergeService");
const { Keypair } = require("@stellar/stellar-sdk");

describe("accountMergeService", () => {
  const sourceKey = Keypair.random().publicKey();
  const destKey = Keypair.random().publicKey();

  it("identifies clean native account as eligible for merge", () => {
    const cleanAccount = {
      id: sourceKey,
      subentry_count: 0,
      balances: [{ asset_type: "native", balance: "15.0000000" }],
      signers: [{ key: sourceKey, weight: 1 }],
    };

    const result = evaluateAccountMergeEligibility(cleanAccount);
    expect(result.eligible).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("flags ineligibility when subentries or non-native tokens exist", () => {
    const dirtyAccount = {
      id: sourceKey,
      subentry_count: 1,
      balances: [
        { asset_type: "native", balance: "15.0000000" },
        { asset_type: "credit_alphanum4", asset_code: "USDC", balance: "20.0" },
      ],
      signers: [{ key: sourceKey, weight: 1 }],
    };

    const result = evaluateAccountMergeEligibility(dirtyAccount);
    expect(result.eligible).toBe(false);
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("builds accountMerge operation for eligible account", () => {
    const cleanAccount = {
      id: sourceKey,
      subentry_count: 0,
      balances: [{ asset_type: "native", balance: "10.0000000" }],
      signers: [{ key: sourceKey, weight: 1 }],
    };

    const op = buildAccountMergeOperation({
      sourceAccount: cleanAccount,
      destinationAddress: destKey,
    });

    expect(op.body().arm()).toBe("destination");
  });

  it("rejects merge into self", () => {
    const cleanAccount = { id: sourceKey, subentry_count: 0, balances: [] };
    expect(() =>
      buildAccountMergeOperation({
        sourceAccount: cleanAccount,
        destinationAddress: sourceKey,
      })
    ).toThrow(/Cannot merge account into itself/);
  });
});
