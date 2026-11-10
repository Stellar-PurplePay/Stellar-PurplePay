"use strict";

const {
  Operation,
  TransactionBuilder,
} = require("@stellar/stellar-sdk");
const { createServiceLogger } = require("../utils/logger");

const logger = createServiceLogger("sorobanRestoreManager");

class SorobanRestoreError extends Error {
  constructor(message, code = "RESTORE_ERROR") {
    super(message);
    this.name = "SorobanRestoreError";
    this.code = code;
  }
}

/**
 * Checks if an error indicates that a Soroban entry is archived and needs restoration.
 * @param {Error|object|string} err
 * @returns {boolean}
 */
function isArchivedEntryError(err) {
  if (!err) return false;
  const msg = typeof err === "string" ? err : String(err.message || "");
  return (
    msg.includes("EntryArchived") ||
    msg.includes("entry is archived") ||
    msg.includes("archived") ||
    msg.includes("MissingValue")
  );
}

/**
 * Builds an Operation.restoreFootprint operation.
 * @returns {Operation}
 */
function buildRestoreFootprintOperation() {
  return Operation.restoreFootprint({});
}

/**
 * Restores an archived contract instance on Soroban.
 *
 * @param {object} params
 * @param {SorobanRpc.Server} params.server
 * @param {Keypair} params.sourceKeypair
 * @param {string} params.contractId
 * @param {string} params.networkPassphrase
 * @returns {Promise<object>}
 */
async function restoreContractInstance({
  server,
  sourceKeypair,
  contractId,
  networkPassphrase,
}) {
  if (!server || !sourceKeypair || !contractId) {
    throw new SorobanRestoreError("server, sourceKeypair, and contractId are required", "MISSING_PARAMS");
  }

  try {
    // 1. Build transaction with restoreFootprint
    const account = await server.getAccount(sourceKeypair.publicKey());
    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase,
    })
      .addOperation(buildRestoreFootprintOperation())
      .setTimeout(180)
      .build();

    // 2. Simulate transaction to populate restoration footprint
    const simRes = await server.simulateTransaction(tx);
    if (simRes.error) {
      throw new Error(`Simulation failed: ${simRes.error}`);
    }

    // 3. Assemble and submit
    const assembledTx = TransactionBuilder.fromXDR(simRes.assembledTransactionXDR, networkPassphrase);
    assembledTx.sign(sourceKeypair);

    const submitRes = await server.sendTransaction(assembledTx);
    logger.info({ contractId, hash: submitRes.hash }, "Contract instance restored successfully");
    return submitRes;
  } catch (err) {
    logger.error({ contractId, error: err.message }, "Failed to restore contract instance");
    throw new SorobanRestoreError(`Contract restoration failed: ${err.message}`, "RESTORE_FAILED");
  }
}

module.exports = {
  isArchivedEntryError,
  buildRestoreFootprintOperation,
  restoreContractInstance,
  SorobanRestoreError,
};
