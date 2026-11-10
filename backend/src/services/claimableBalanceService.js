"use strict";

const {
  Operation,
  Claimant,
  StrKey,
} = require("@stellar/stellar-sdk");

class ClaimableBalanceError extends Error {
  constructor(message, code = "CLAIMABLE_BALANCE_ERROR") {
    super(message);
    this.name = "ClaimableBalanceError";
    this.code = code;
  }
}

/**
 * Builds a createClaimableBalance operation.
 *
 * @param {object} params
 * @param {Asset} params.asset - Stellar asset to lock
 * @param {string|number} params.amount - Amount
 * @param {Array<{ destination: string, predicate?: ClaimantPredicate }>} params.claimants
 * @returns {Operation}
 */
function buildCreateClaimableBalanceOperation({ asset, amount, claimants }) {
  if (!asset) {
    throw new ClaimableBalanceError("asset is required", "MISSING_ASSET");
  }

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    throw new ClaimableBalanceError("amount must be a positive number", "INVALID_AMOUNT");
  }

  if (!Array.isArray(claimants) || claimants.length === 0) {
    throw new ClaimableBalanceError("claimants must be a non-empty array", "INVALID_CLAIMANTS");
  }

  const formattedClaimants = claimants.map((c, idx) => {
    if (!c.destination || !StrKey.isValidEd25519PublicKey(c.destination)) {
      throw new ClaimableBalanceError(
        `Claimant ${idx}: Invalid destination Stellar public key '${c.destination}'`,
        "INVALID_CLAIMANT_DESTINATION"
      );
    }
    const predicate = c.predicate || Claimant.predicateUnconditional();
    return new Claimant(c.destination, predicate);
  });

  return Operation.createClaimableBalance({
    asset,
    amount: String(amount),
    claimants: formattedClaimants,
  });
}

/**
 * Builds a claimClaimableBalance operation.
 *
 * @param {object} params
 * @param {string} params.balanceId - 64+ hex characters representing claimable balance ID
 * @returns {Operation}
 */
function buildClaimClaimableBalanceOperation({ balanceId }) {
  if (!balanceId || typeof balanceId !== "string" || balanceId.length < 64) {
    throw new ClaimableBalanceError(
      "balanceId must be a valid claimable balance hexadecimal string",
      "INVALID_BALANCE_ID"
    );
  }

  return Operation.claimClaimableBalance({
    balanceId,
  });
}

module.exports = {
  buildCreateClaimableBalanceOperation,
  buildClaimClaimableBalanceOperation,
  ClaimableBalanceError,
};
