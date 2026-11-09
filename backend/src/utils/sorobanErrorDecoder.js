"use strict";

/**
 * Standard contract error codes defined in the PurplePay Soroban Escrow contracts.
 */
const ESCROW_CONTRACT_ERROR_MAP = {
  1: { name: "AlreadyInitialized", description: "Contract has already been initialized and cannot be re-initialized." },
  2: { name: "NotInitialized", description: "Contract has not been initialized. Initialize before calling functions." },
  3: { name: "Unauthorized", description: "Caller does not have required permissions or signer authorization for this operation." },
  4: { name: "InvalidState", description: "Escrow or milestone is not in the required state for this transition." },
  5: { name: "InsufficientFunds", description: "Contract does not hold sufficient balance to fulfill payout or refund." },
  6: { name: "MilestoneNotFound", description: "The requested milestone ID was not found in contract storage." },
  7: { name: "DisputeActive", description: "Operation cannot be performed while an active dispute is pending resolution." },
  8: { name: "DisputeNotActive", description: "Cannot resolve dispute because no dispute is currently active." },
  9: { name: "DeadlinePassed", description: "The milestone or escrow deadline has already passed." },
  10: { name: "DeadlineNotPassed", description: "Action cannot be executed until the milestone deadline expires." },
  11: { name: "AmountMismatch", description: "Deposit or payout amount does not match the configured escrow sum." },
  12: { name: "FeeExceedsLimit", description: "Platform or arbitrator fee exceeds the configured maximum limit." },
  13: { name: "InvalidEngagementId", description: "Engagement ID exceeds allowed size or contains invalid bytes." },
  14: { name: "ArbitratorNotSet", description: "No arbitrator address is configured for this escrow." },
  15: { name: "EscrowNotDisputed", description: "Dispute resolution failed because the escrow is not in Disputed status." },
  16: { name: "InvalidFee", description: "Configured platform fee exceeds the maximum allowed ceiling (10.00% / 1,000 bps)." },
  17: { name: "InvalidMilestoneCount", description: "Milestone count must be between 1 and 25 to guarantee gas bounds." },
  18: { name: "InvalidMilestoneData", description: "Milestone descriptions cannot be empty and percentages must sum to 100%." },
  19: { name: "ContractPaused", description: "Contract operations are currently paused by the administrator emergency circuit breaker." },
  20: { name: "ContractNotPaused", description: "Contract cannot be unpaused because it is not currently paused." },
};

const HOST_ERROR_TYPE_MAP = {
  Storage: "Host storage failure (missing value, read-only violation, or key length overflow).",
  Context: "Host context error (invalid action or reentrant invocation).",
  Budget: "Soroban budget exhausted (CPU instructions or memory exceeded limits).",
  Auth: "Contract authorization verification failure (missing signatures or invalid address).",
  WasmVm: "WebAssembly execution failure (out-of-bounds memory or unreachable trap).",
};

/**
 * Decodes Soroban error messages, regex matching contract and host error patterns.
 *
 * @param {string|Error} err - Error message or Error object
 * @returns {object} Decoded diagnostic structure
 */
function decodeSorobanError(err) {
  const message = typeof err === "string" ? err : String(err?.message || err || "");

  // Match: Error(Contract, #123)
  const contractMatch = message.match(/Error\(Contract,\s*#?(\d+)\)/);
  if (contractMatch) {
    const code = parseInt(contractMatch[1], 10);
    const known = ESCROW_CONTRACT_ERROR_MAP[code];
    return {
      category: "contract",
      code,
      name: known?.name || `UnknownContractError_${code}`,
      description: known?.description || `Contract reverted with custom error code #${code}.`,
      raw: message,
    };
  }

  // Match: Error(Storage, MissingValue)
  const hostMatch = message.match(/Error\((\w+),\s*(\w+)\)/);
  if (hostMatch) {
    const [, hostType, hostCode] = hostMatch;
    const categoryDesc = HOST_ERROR_TYPE_MAP[hostType] || "General Soroban host execution failure.";
    return {
      category: "host",
      code: hostCode,
      name: `${hostType}.${hostCode}`,
      description: `${categoryDesc} (${hostType}: ${hostCode})`,
      raw: message,
    };
  }

  return {
    category: "unknown",
    code: null,
    name: "UnknownError",
    description: message || "Unknown Soroban error occurred.",
    raw: message,
  };
}

module.exports = {
  decodeSorobanError,
  ESCROW_CONTRACT_ERROR_MAP,
  HOST_ERROR_TYPE_MAP,
};
