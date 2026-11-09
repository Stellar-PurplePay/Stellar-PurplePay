"use strict";

const {
  buildFeeBumpTransaction,
  calculateBumpedFee,
  MAX_ALLOWED_FEE_BUMP_STROOPS,
  FeeBumpError,
} = require("./feeBumpService");
const {
  Keypair,
  TransactionBuilder,
  Account,
  Operation,
  Asset,
  Networks,
  FeeBumpTransaction,
} = require("@stellar/stellar-sdk");

describe("feeBumpService", () => {
  const source = Keypair.random();
  const feeSource = Keypair.random();
  const destination = Keypair.random();

  function makeSampleTransaction(fee = "100") {
    const account = new Account(source.publicKey(), "500");
    return new TransactionBuilder(account, {
      fee,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: destination.publicKey(),
          asset: Asset.native(),
          amount: "10",
        })
      )
      .setTimeout(300)
      .build();
  }

  describe("buildFeeBumpTransaction", () => {
    it("successfully creates and signs a FeeBumpTransaction", () => {
      const innerTx = makeSampleTransaction("200");
      innerTx.sign(source);

      const feeBump = buildFeeBumpTransaction({
        innerTx,
        feeSource,
        maxFee: 500,
        networkPassphrase: Networks.TESTNET,
      });

      expect(feeBump).toBeInstanceOf(FeeBumpTransaction);
      expect(feeBump.feeSource).toBe(feeSource.publicKey());
      expect(Number(feeBump.fee)).toBe(500);
      expect(feeBump.signatures.length).toBeGreaterThan(0);
    });

    it("rejects non-Transaction or null innerTx", () => {
      expect(() =>
        buildFeeBumpTransaction({
          innerTx: null,
          feeSource,
          maxFee: 500,
        })
      ).toThrow(FeeBumpError);
    });

    it("rejects maxFee that exceeds platform ceiling", () => {
      const innerTx = makeSampleTransaction("200");
      expect(() =>
        buildFeeBumpTransaction({
          innerTx,
          feeSource,
          maxFee: MAX_ALLOWED_FEE_BUMP_STROOPS + 1,
        })
      ).toThrow(/exceeds platform safety ceiling/);
    });

    it("rejects maxFee lower than inner transaction fee", () => {
      const innerTx = makeSampleTransaction("1000");
      expect(() =>
        buildFeeBumpTransaction({
          innerTx,
          feeSource,
          maxFee: 500,
        })
      ).toThrow(/must be greater than or equal to inner transaction fee/);
    });
  });

  describe("calculateBumpedFee", () => {
    it("multiplies per-operation fee by surge multiplier", () => {
      const innerTx = makeSampleTransaction("200");
      const bumped = calculateBumpedFee(innerTx, 2.5);
      expect(bumped).toBe(500);
    });

    it("caps bumped fee at platform ceiling", () => {
      const innerTx = makeSampleTransaction("40000000");
      const bumped = calculateBumpedFee(innerTx, 3.0);
      expect(bumped).toBe(MAX_ALLOWED_FEE_BUMP_STROOPS);
    });
  });
});
