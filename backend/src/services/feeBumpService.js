"use strict";

const {
  Transaction,
  FeeBumpTransaction,
  TransactionBuilder,
  Networks,
} = require("@stellar/stellar-sdk");

const DEFAULT_BASE_FEE_STROOPS = 100;
const MAX_ALLOWED_FEE_BUMP_STROOPS = 50000000; // 5 XLM maximum safety ceiling

class FeeBumpError extends Error {
  constructor(message, code = "FEE_BUMP_ERROR") {
    super(message);
    this.name = "FeeBumpError";
    this.code = code;
  }
}

/**
 * Builds and signs a Stellar CAP-0015 FeeBumpTransaction wrapping an inner transaction.
 *
 * @param {object} params
 * @param {Transaction} params.innerTx - Stellar transaction to bump
 * @param {Keypair} params.feeSource - Keypair paying the bumped fee
 * @param {number|string|bigint} params.maxFee - Max fee in stroops
 * @param {string} [params.networkPassphrase]
 * @returns {FeeBumpTransaction}
 */
function buildFeeBumpTransaction({
  innerTx,
  feeSource,
  maxFee,
  networkPassphrase = Networks.TESTNET,
}) {
  if (!innerTx || !(innerTx instanceof Transaction)) {
    throw new FeeBumpError(
      "innerTx must be an instance of Stellar Transaction (FeeBumpTransaction cannot be nested)",
      "INVALID_INNER_TX"
    );
  }

  if (!feeSource || typeof feeSource.publicKey !== "function") {
    throw new FeeBumpError("Valid feeSource keypair is required", "INVALID_FEE_SOURCE");
  }

  const numericMaxFee = Number(maxFee);
  if (!Number.isInteger(numericMaxFee) || numericMaxFee <= 0) {
    throw new FeeBumpError("maxFee must be a positive integer in stroops", "INVALID_MAX_FEE");
  }

  if (numericMaxFee > MAX_ALLOWED_FEE_BUMP_STROOPS) {
    throw new FeeBumpError(
      `maxFee (${numericMaxFee} stroops) exceeds platform safety ceiling (${MAX_ALLOWED_FEE_BUMP_STROOPS} stroops)`,
      "FEE_EXCEEDS_CEILING"
    );
  }

  const innerFee = Number(innerTx.fee);
  if (numericMaxFee < innerFee) {
    throw new FeeBumpError(
      `maxFee (${numericMaxFee} stroops) must be greater than or equal to inner transaction fee (${innerFee} stroops)`,
      "FEE_LOWER_THAN_INNER"
    );
  }

  // In Stellar SDK, the second parameter to buildFeeBumpTransaction is the base fee per operation.
  // The fee bump transaction itself accounts for (innerTx.operations.length + 1) operations.
  const opCount = (innerTx.operations ? innerTx.operations.length : 0) + 1;
  const perOpFee = Math.max(1, Math.floor(numericMaxFee / opCount));

  const feeBump = TransactionBuilder.buildFeeBumpTransaction(
    feeSource,
    String(perOpFee),
    innerTx,
    networkPassphrase
  );

  feeBump.sign(feeSource);
  return feeBump;
}

/**
 * Calculates a recommended bumped fee based on inner operation count and network surge multiplier.
 *
 * @param {Transaction} innerTx
 * @param {number} [multiplier=2.0]
 * @returns {number} Recommended fee in stroops
 */
function calculateBumpedFee(innerTx, multiplier = 2.0) {
  if (!innerTx || !innerTx.operations) {
    return DEFAULT_BASE_FEE_STROOPS * 2;
  }
  const opCount = Math.max(1, innerTx.operations.length);
  const currentPerOpFee = Math.max(DEFAULT_BASE_FEE_STROOPS, Math.floor(Number(innerTx.fee) / opCount));
  const bumpedPerOp = Math.ceil(currentPerOpFee * Math.max(1.1, multiplier));
  return Math.min(bumpedPerOp * opCount, MAX_ALLOWED_FEE_BUMP_STROOPS);
}

module.exports = {
  buildFeeBumpTransaction,
  calculateBumpedFee,
  MAX_ALLOWED_FEE_BUMP_STROOPS,
  FeeBumpError,
};
