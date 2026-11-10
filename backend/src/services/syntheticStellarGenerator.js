const crypto = require("crypto");
const StellarSdk = require("@stellar/stellar-sdk");

/**
 * Service to generate synthetic Stellar transactions and Horizon responses
 * for offline integration testing, stress testing, and staging simulations.
 */
class SyntheticStellarGenerator {
  /**
   * Generates a deterministic or random Stellar Keypair for simulation.
   */
  static generateKeypair() {
    return StellarSdk.Keypair.random();
  }

  /**
   * Builds and signs a real Stellar transaction envelope returning XDR.
   */
  static buildSignedPaymentXdr({
    sourceKeypair,
    destinationPublicKey,
    amount,
    memoText = "simulation",
    networkPassphrase = StellarSdk.Networks.TESTNET,
    baseFee = "100",
  }) {
    const sourceAccount = new StellarSdk.Account(sourceKeypair.publicKey(), "100");
    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: baseFee,
      networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: destinationPublicKey,
          asset: StellarSdk.Asset.native(),
          amount: String(amount),
        })
      )
      .addMemo(StellarSdk.Memo.text(memoText.slice(0, 28)))
      .setTimeout(300)
      .build();

    tx.sign(sourceKeypair);
    return tx.toXDR();
  }

  /**
   * Synthesizes a mock Horizon transaction response object.
   */
  static mockHorizonTransaction({
    id,
    sourceAccount,
    ledger = 123456,
    feeCharged = 100,
    successful = true,
    memo = "synthetic-tx",
  }) {
    const txHash = id || crypto.randomBytes(32).toString("hex");
    return {
      id: txHash,
      hash: txHash,
      ledger,
      created_at: new Date().toISOString(),
      source_account: sourceAccount,
      source_account_sequence: "101",
      fee_charged: feeCharged,
      max_fee: 1000,
      operation_count: 1,
      envelope_xdr: "AAAA...",
      result_xdr: "AAAA...",
      fee_meta_xdr: "AAAA...",
      successful,
      memo,
      memo_type: "text",
    };
  }

  /**
   * Synthesizes a mock Horizon payment operation response object.
   */
  static mockPaymentOperation({
    id = "op-1",
    from,
    to,
    amount = "10.0000000",
    assetCode = "XLM",
    transactionSuccessful = true,
  }) {
    return {
      id,
      type: "payment",
      type_i: 1,
      created_at: new Date().toISOString(),
      transaction_successful: transactionSuccessful,
      source_account: from,
      from,
      to,
      asset_type: assetCode === "XLM" ? "native" : "credit_alphanum4",
      asset_code: assetCode === "XLM" ? undefined : assetCode,
      amount: String(amount),
    };
  }
}

module.exports = SyntheticStellarGenerator;
