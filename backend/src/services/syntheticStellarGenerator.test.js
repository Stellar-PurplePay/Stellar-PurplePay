const StellarSdk = require("@stellar/stellar-sdk");
const SyntheticStellarGenerator = require("./syntheticStellarGenerator");

describe("SyntheticStellarGenerator Service", () => {
  it("should generate random keypairs with valid public and secret keys", () => {
    const kp = SyntheticStellarGenerator.generateKeypair();
    expect(StellarSdk.StrKey.isValidEd25519PublicKey(kp.publicKey())).toBe(true);
    expect(StellarSdk.StrKey.isValidEd25519SecretSeed(kp.secret())).toBe(true);
  });

  it("should construct and sign a real Stellar payment transaction XDR", () => {
    const source = SyntheticStellarGenerator.generateKeypair();
    const dest = SyntheticStellarGenerator.generateKeypair();

    const xdr = SyntheticStellarGenerator.buildSignedPaymentXdr({
      sourceKeypair: source,
      destinationPublicKey: dest.publicKey(),
      amount: "25.5",
      memoText: "test-sim-transfer",
    });

    expect(typeof xdr).toBe("string");
    expect(xdr.length).toBeGreaterThan(50);

    // Verify it parses back via StellarSdk Transaction
    const tx = new StellarSdk.Transaction(xdr, StellarSdk.Networks.TESTNET);
    expect(tx.source).toBe(source.publicKey());
    expect(tx.operations).toHaveLength(1);
    expect(tx.operations[0].type).toBe("payment");
    expect(tx.operations[0].destination).toBe(dest.publicKey());
    expect(tx.operations[0].amount).toBe("25.5000000");
    expect(tx.memo.value.toString("utf8")).toBe("test-sim-transfer");
    expect(tx.signatures).toHaveLength(1);
  });

  it("should generate synthetic Horizon transaction and operation payloads", () => {
    const source = SyntheticStellarGenerator.generateKeypair().publicKey();
    const dest = SyntheticStellarGenerator.generateKeypair().publicKey();

    const mockTx = SyntheticStellarGenerator.mockHorizonTransaction({
      sourceAccount: source,
      ledger: 98765,
      feeCharged: 120,
    });

    expect(mockTx.source_account).toBe(source);
    expect(mockTx.ledger).toBe(98765);
    expect(mockTx.fee_charged).toBe(120);
    expect(mockTx.successful).toBe(true);

    const mockOp = SyntheticStellarGenerator.mockPaymentOperation({
      from: source,
      to: dest,
      amount: "50.0000000",
      assetCode: "USDC",
    });

    expect(mockOp.type).toBe("payment");
    expect(mockOp.from).toBe(source);
    expect(mockOp.to).toBe(dest);
    expect(mockOp.amount).toBe("50.0000000");
    expect(mockOp.asset_code).toBe("USDC");
  });
});
