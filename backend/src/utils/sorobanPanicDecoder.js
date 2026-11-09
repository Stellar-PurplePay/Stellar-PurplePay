"use strict";

/**
 * Soroban host error diagnostic catalog and recovery recommendations.
 */
const PANIC_DIAGNOSTIC_CATALOG = {
  Storage: {
    MissingValue: {
      retryable: false,
      userMessage: "Required contract state entry was not found in ledger storage.",
      remediation: "Verify that the requested escrow ID or record exists. If older than ledger TTL, restore the archived entry via restoreFootprint before calling.",
    },
    EntryExpired: {
      retryable: true,
      userMessage: "Contract storage entry has expired.",
      remediation: "Submit a RestoreFootprintOp or ExtendFootprintTtlOp transaction for the targeted contract instance or storage key.",
    },
    ReadOnlyViolation: {
      retryable: false,
      userMessage: "Contract attempted to write to a ledger key declared in read-only footprint.",
      remediation: "Update simulation footprint to classify the affected contract storage key as read-write.",
    },
  },
  Budget: {
    CpuLimitExceeded: {
      retryable: true,
      userMessage: "Soroban CPU instruction budget exceeded during execution.",
      remediation: "Optimize contract looping logic or re-simulate with an elevated instruction limit parameter.",
    },
    MemoryLimitExceeded: {
      retryable: true,
      userMessage: "Soroban memory allocation limit exceeded.",
      remediation: "Reduce batch chunk sizes or in-memory vector sizes passed to contract arguments.",
    },
  },
  Auth: {
    InvalidAction: {
      retryable: false,
      userMessage: "Unauthorized contract invocation action.",
      remediation: "Ensure the signing wallet matches the required client, freelancer, or admin role in the contract.",
    },
    MissingSignature: {
      retryable: true,
      userMessage: "Transaction is missing required cryptographic signatures.",
      remediation: "Prompt the user wallet to sign the contract authorization envelope with required source keys.",
    },
    ContextMismatch: {
      retryable: false,
      userMessage: "Auth context does not match invocation arguments.",
      remediation: "Re-generate contract call simulation envelope to align auth trees with current argument values.",
    },
  },
  WasmVm: {
    Unreachable: {
      retryable: false,
      userMessage: "Contract execution encountered an explicit panic or unreachable trap.",
      remediation: "Check contract panic condition: an assertion or require statement failed in Soroban contract logic.",
    },
    IntegerOverflow: {
      retryable: false,
      userMessage: "Arithmetic overflow occurred in contract calculations.",
      remediation: "Ensure milestone amounts and fee percentages do not overflow 64-bit/128-bit integer boundaries.",
    },
  },
};

/**
 * Classifies a raw Soroban host panic error and produces structured diagnostic advice.
 *
 * @param {string|Error|object} error - Raw error or RPC diagnostic event
 * @returns {object} Structured panic diagnostic report
 */
function classifySorobanPanic(error) {
  const errorStr = typeof error === "string" ? error : String(error?.message || error?.details || JSON.stringify(error) || "");

  // Match pattern: Error(Storage, MissingValue) or Error(Budget, CpuLimitExceeded)
  const hostMatch = errorStr.match(/Error\((Storage|Budget|Auth|WasmVm|Context),\s*([A-Za-z0-9_]+)\)/i);

  if (hostMatch) {
    const [, rawCategory, rawSubCode] = hostMatch;
    // Capitalize category
    const category = rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1);
    const subCode = rawSubCode;

    const catalogEntry = PANIC_DIAGNOSTIC_CATALOG[category]?.[subCode];

    if (catalogEntry) {
      return {
        isPanic: true,
        category,
        subCode,
        isRetryable: catalogEntry.retryable,
        userMessage: catalogEntry.userMessage,
        remediation: catalogEntry.remediation,
        raw: errorStr,
      };
    }

    return {
      isPanic: true,
      category,
      subCode,
      isRetryable: category === "Budget",
      userMessage: `Soroban host failure in ${category} subsystem (${subCode}).`,
      remediation: `Inspect host diagnostic events for ${category} and verify parameter constraints.`,
      raw: errorStr,
    };
  }

  // Check for out of gas / budget keywords
  if (/cpu limit|budget exceeded|instruction limit/i.test(errorStr)) {
    return {
      isPanic: true,
      category: "Budget",
      subCode: "CpuLimitExceeded",
      isRetryable: true,
      userMessage: PANIC_DIAGNOSTIC_CATALOG.Budget.CpuLimitExceeded.userMessage,
      remediation: PANIC_DIAGNOSTIC_CATALOG.Budget.CpuLimitExceeded.remediation,
      raw: errorStr,
    };
  }

  // Check for expired TTL / missing entry
  if (/entry expired|missing entry|storage/i.test(errorStr)) {
    return {
      isPanic: true,
      category: "Storage",
      subCode: "MissingValue",
      isRetryable: false,
      userMessage: PANIC_DIAGNOSTIC_CATALOG.Storage.MissingValue.userMessage,
      remediation: PANIC_DIAGNOSTIC_CATALOG.Storage.MissingValue.remediation,
      raw: errorStr,
    };
  }

  return {
    isPanic: false,
    category: "General",
    subCode: "Unclassified",
    isRetryable: false,
    userMessage: "An unclassified contract or network error occurred.",
    remediation: "Check network connectivity and RPC node availability.",
    raw: errorStr,
  };
}

module.exports = {
  classifySorobanPanic,
  PANIC_DIAGNOSTIC_CATALOG,
};
