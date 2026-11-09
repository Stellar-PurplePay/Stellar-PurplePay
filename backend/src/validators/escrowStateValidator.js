"use strict";

const VALID_TRANSITIONS = {
  CREATED: ["IN_PROGRESS", "REFUNDED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "DISPUTED", "REFUNDED", "CANCELLED"],
  DISPUTED: ["COMPLETED", "REFUNDED", "CANCELLED"],
  COMPLETED: [],
  REFUNDED: [],
  CANCELLED: [],
};

const TX_HASH_REGEX = /^[0-9a-fA-F]{64}$/;

/**
 * Validates escrow state transitions to ensure database integrity and alignment with on-chain Soroban lifecycle.
 *
 * @param {string} currentStatus - Current database status
 * @param {string} targetStatus - Proposed target status
 * @param {Object} [context] - Context containing transactionHash, reason, etc.
 * @returns {{ valid: boolean, error?: string }}
 */
function validateStateTransition(currentStatus, targetStatus, context = {}) {
  const current = (currentStatus || "").toUpperCase();
  const target = (targetStatus || "").toUpperCase();

  if (!VALID_TRANSITIONS[current]) {
    return {
      valid: false,
      error: `Invalid current status: "${currentStatus}"`,
    };
  }

  if (!VALID_TRANSITIONS[current].includes(target)) {
    return {
      valid: false,
      error: `Illegal state transition from "${current}" to "${target}". Terminal states cannot be reverted.`,
    };
  }

  // Requiring on-chain transaction hash proof for final settlement states
  if (["COMPLETED", "REFUNDED"].includes(target)) {
    if (!context.transactionHash || !TX_HASH_REGEX.test(context.transactionHash.trim())) {
      return {
        valid: false,
        error: `Transition to "${target}" requires a valid 64-character on-chain transactionHash proof.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validates partial release invariants before committing database updates.
 *
 * @param {number|string|bigint} milestoneTotal
 * @param {number|string|bigint} previouslyReleased
 * @param {number|string|bigint} releaseRequest
 * @returns {{ valid: boolean, remaining: bigint, error?: string }}
 */
function validateMilestoneReleaseAmount(milestoneTotal, previouslyReleased, releaseRequest) {
  try {
    const total = BigInt(milestoneTotal);
    const released = BigInt(previouslyReleased || "0");
    const request = BigInt(releaseRequest);

    if (request <= 0n) {
      return { valid: false, remaining: 0n, error: "Release amount must be greater than zero." };
    }

    const remaining = total - released;
    if (request > remaining) {
      return {
        valid: false,
        remaining,
        error: `Requested amount (${request}) exceeds remaining milestone balance (${remaining}).`,
      };
    }

    return { valid: true, remaining: remaining - request };
  } catch (err) {
    return { valid: false, remaining: 0n, error: "Invalid numeric amount supplied for release validation." };
  }
}

module.exports = {
  validateStateTransition,
  validateMilestoneReleaseAmount,
  VALID_TRANSITIONS,
};
