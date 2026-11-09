"use strict";

const { Operation, StrKey } = require("@stellar/stellar-sdk");

class AccountMergeError extends Error {
  constructor(message, code = "ACCOUNT_MERGE_ERROR", details = []) {
    super(message);
    this.name = "AccountMergeError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Checks whether a Stellar account satisfies all protocol rules to be merged.
 *
 * @param {object} accountResponse - Horizon account response
 * @returns {{ eligible: boolean, reasons: string[] }}
 */
function evaluateAccountMergeEligibility(accountResponse) {
  const reasons = [];

  if (!accountResponse) {
    return { eligible: false, reasons: ["Account response is null or undefined"] };
  }

  const subentryCount = accountResponse.subentry_count || 0;
  if (subentryCount > 0) {
    reasons.push(
      `Account has ${subentryCount} open subentries (trustlines, offers, or data entries). All non-native trustlines and offers must be cleared before merge.`
    );
  }

  const balances = accountResponse.balances || [];
  const nonNativeBalances = balances.filter((b) => b.asset_type !== "native");
  if (nonNativeBalances.length > 0) {
    reasons.push(
      `Account holds ${nonNativeBalances.length} non-native assets. All non-native tokens must be sent or burned before closing trustlines.`
    );
  }

  const signers = accountResponse.signers || [];
  const additionalSigners = signers.filter((s) => s.key !== accountResponse.id);
  if (additionalSigners.length > 0) {
    reasons.push(
      `Account has ${additionalSigners.length} secondary signers configured that must be removed prior to merge.`
    );
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

/**
 * Builds an accountMerge operation after validating destination and source eligibility.
 *
 * @param {object} params
 * @param {object} params.sourceAccount - Horizon account response
 * @param {string} params.destinationAddress - Stellar public key receiving the balance
 * @returns {Operation}
 */
function buildAccountMergeOperation({ sourceAccount, destinationAddress }) {
  if (!StrKey.isValidEd25519PublicKey(destinationAddress)) {
    throw new AccountMergeError(
      "Invalid destinationAddress: must be a valid Stellar public key",
      "INVALID_DESTINATION"
    );
  }

  if (sourceAccount?.id === destinationAddress) {
    throw new AccountMergeError(
      "Cannot merge account into itself",
      "SELF_MERGE_DISALLOWED"
    );
  }

  const check = evaluateAccountMergeEligibility(sourceAccount);
  if (!check.eligible) {
    throw new AccountMergeError(
      "Account is not eligible for merge: subentries or non-native balances exist",
      "INELIGIBLE_FOR_MERGE",
      check.reasons
    );
  }

  return Operation.accountMerge({
    destination: destinationAddress,
  });
}

module.exports = {
  evaluateAccountMergeEligibility,
  buildAccountMergeOperation,
  AccountMergeError,
};
