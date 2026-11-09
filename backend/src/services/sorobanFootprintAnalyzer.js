"use strict";

const { xdr } = require("@stellar/stellar-sdk");

class FootprintAnalysisError extends Error {
  constructor(message) {
    super(message);
    this.name = "FootprintAnalysisError";
  }
}

/**
 * Converts a ledgerKey to a stable string representation for set comparison.
 * @param {xdr.LedgerKey} key
 * @returns {string}
 */
function ledgerKeyToKeyString(key) {
  try {
    if (typeof key.toXDR === "function") {
      return key.toXDR("hex");
    }
    return JSON.stringify(key);
  } catch {
    return String(key);
  }
}

/**
 * Analyzes the footprint from SorobanTransactionData or simulation results.
 *
 * @param {xdr.SorobanTransactionData|object} txData
 * @returns {object}
 */
function analyzeFootprint(txData) {
  if (!txData) {
    throw new FootprintAnalysisError("txData cannot be null or undefined");
  }

  // Handle both raw XDR objects and JSON-like simulated structures
  const footprint = txData.resources ? txData.resources().footprint() : txData.footprint;
  if (!footprint) {
    throw new FootprintAnalysisError("Missing footprint in Soroban transaction data");
  }

  const readOnlyKeys = (footprint.readOnly ? footprint.readOnly() : footprint.read_only) || [];
  const readWriteKeys = (footprint.readWrite ? footprint.readWrite() : footprint.read_write) || [];

  const readOnlySet = new Set(readOnlyKeys.map(ledgerKeyToKeyString));
  const readWriteSet = new Set(readWriteKeys.map(ledgerKeyToKeyString));

  return {
    readOnlyCount: readOnlyKeys.length,
    readWriteCount: readWriteKeys.length,
    hasStateModifications: readWriteKeys.length > 0,
    readOnlyKeys: readOnlyKeys.map(ledgerKeyToKeyString),
    readWriteKeys: readWriteKeys.map(ledgerKeyToKeyString),

    /**
     * Checks if this footprint has read-write or write-write conflicts with another footprint.
     * @param {object} otherAnalysis - Return value of analyzeFootprint
     * @returns {boolean} True if conflicting keys exist
     */
    conflictsWith(otherAnalysis) {
      if (!otherAnalysis) return false;

      // Conflict if my readWrite overlaps with other's readWrite OR readOnly
      for (const key of readWriteSet) {
        if (otherAnalysis.readWriteKeys.includes(key) || otherAnalysis.readOnlyKeys.includes(key)) {
          return true;
        }
      }

      // Conflict if my readOnly overlaps with other's readWrite
      for (const key of readOnlySet) {
        if (otherAnalysis.readWriteKeys.includes(key)) {
          return true;
        }
      }

      return false;
    },
  };
}

module.exports = {
  analyzeFootprint,
  ledgerKeyToKeyString,
  FootprintAnalysisError,
};
