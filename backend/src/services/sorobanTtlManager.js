"use strict";

const {
  xdr,
  Address,
  Operation,
} = require("@stellar/stellar-sdk");
const { createServiceLogger } = require("../utils/logger");

const logger = createServiceLogger("sorobanTtlManager");

const SECONDS_PER_LEDGER = 5;
const DEFAULT_TTL_WARNING_THRESHOLD_LEDGERS = 17280; // ~24 hours (17,280 * 5s = 86,400s)
const DEFAULT_EXTEND_TO_LEDGERS = 518400; // ~30 days

class SorobanTtlError extends Error {
  constructor(message, code = "SOROBAN_TTL_ERROR") {
    super(message);
    this.name = "SorobanTtlError";
    this.code = code;
  }
}

/**
 * Creates the LedgerKey for a contract's instance storage.
 * @param {string} contractId
 * @returns {xdr.LedgerKey}
 */
function createContractInstanceLedgerKey(contractId) {
  try {
    const address = Address.fromString(contractId);
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: address.toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
  } catch (err) {
    throw new SorobanTtlError(`Invalid contractId: ${err.message}`, "INVALID_CONTRACT_ID");
  }
}

/**
 * Checks remaining TTL for a Soroban contract instance.
 *
 * @param {SorobanRpc.Server} server
 * @param {string} contractId
 * @param {object} [options]
 * @param {number} [options.thresholdLedgers=17280]
 * @returns {Promise<{ remainingLedgers: number, remainingSeconds: number, needsExtension: boolean, liveUntilLedgerSeq: number, currentLedgerSeq: number }>}
 */
async function checkContractTtl(server, contractId, options = {}) {
  const threshold = options.thresholdLedgers || DEFAULT_TTL_WARNING_THRESHOLD_LEDGERS;

  if (!server || typeof server.getLedgerEntries !== "function") {
    throw new SorobanTtlError("A valid Soroban RPC Server is required", "INVALID_SERVER");
  }

  const ledgerKey = createContractInstanceLedgerKey(contractId);

  const [entriesRes, latestLedgerRes] = await Promise.all([
    server.getLedgerEntries(ledgerKey),
    server.getLatestLedger(),
  ]);

  const entry = (entriesRes.entries || [])[0];
  if (!entry) {
    throw new SorobanTtlError(
      `Contract instance entry not found for ${contractId}. Contract may not exist or has been archived.`,
      "ENTRY_NOT_FOUND"
    );
  }

  const currentLedgerSeq = latestLedgerRes.sequence;
  const liveUntilLedgerSeq = entry.liveUntilLedgerSeq;

  if (typeof liveUntilLedgerSeq !== "number") {
    throw new SorobanTtlError(
      "Missing liveUntilLedgerSeq on ledger entry",
      "MISSING_TTL_METADATA"
    );
  }

  const remainingLedgers = Math.max(0, liveUntilLedgerSeq - currentLedgerSeq);
  const remainingSeconds = remainingLedgers * SECONDS_PER_LEDGER;
  const needsExtension = remainingLedgers < threshold;

  if (needsExtension) {
    logger.warn(
      { contractId, remainingLedgers, remainingSeconds, threshold },
      "Soroban contract instance TTL is below warning threshold"
    );
  }

  return {
    contractId,
    currentLedgerSeq,
    liveUntilLedgerSeq,
    remainingLedgers,
    remainingSeconds,
    needsExtension,
  };
}

/**
 * Builds an Operation.extendFootprintTtl operation to extend storage lifetime.
 *
 * @param {object} params
 * @param {number} [params.extendTo=518400]
 * @returns {Operation}
 */
function buildExtendFootprintTtlOp(params = {}) {
  const extendTo = params.extendTo || DEFAULT_EXTEND_TO_LEDGERS;
  return Operation.extendFootprintTtl({
    extendTo,
  });
}

module.exports = {
  checkContractTtl,
  createContractInstanceLedgerKey,
  buildExtendFootprintTtlOp,
  DEFAULT_TTL_WARNING_THRESHOLD_LEDGERS,
  DEFAULT_EXTEND_TO_LEDGERS,
  SECONDS_PER_LEDGER,
  SorobanTtlError,
};
