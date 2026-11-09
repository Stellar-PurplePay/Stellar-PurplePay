"use strict";

const { callWithLimit } = require("../utils/horizonClient");
const { createServiceLogger } = require("../utils/logger");

const logger = createServiceLogger("horizonTxWatcher");

class TransactionTimeoutError extends Error {
  constructor(message, txHash) {
    super(message);
    this.name = "TransactionTimeoutError";
    this.txHash = txHash;
  }
}

/**
 * Polls Horizon until a transaction appears in a closed ledger or timeout is reached.
 *
 * @param {Horizon.Server} horizonServer
 * @param {string} txHash - 64-character hex transaction hash
 * @param {object} [options]
 * @param {number} [options.timeoutMs=30000]
 * @param {number} [options.pollIntervalMs=1000]
 * @returns {Promise<object>} Confirmed transaction record
 */
async function waitForTransactionConfirmation(
  horizonServer,
  txHash,
  options = {}
) {
  const timeoutMs = options.timeoutMs || 30000;
  const pollIntervalMs = options.pollIntervalMs || 1000;
  const startTime = Date.now();

  if (!txHash || typeof txHash !== "string" || txHash.length !== 64) {
    throw new Error(`Invalid transaction hash: '${txHash}'`);
  }

  while (Date.now() - startTime < timeoutMs) {
    try {
      const tx = await callWithLimit(
        () => horizonServer.transactions().transaction(txHash).call(),
        "watchTx"
      );

      if (tx && tx.successful !== undefined) {
        logger.info(
          { txHash, ledger: tx.ledger_attr || tx.ledger },
          "Transaction confirmed on ledger"
        );
        return {
          confirmed: true,
          hash: txHash,
          ledger: tx.ledger_attr || tx.ledger,
          createdAt: tx.created_at,
          feeCharged: tx.fee_charged,
          successful: tx.successful,
          envelopeXdr: tx.envelope_xdr,
        };
      }
    } catch (err) {
      const status = err.response?.status || err.status;
      // 404 means the transaction has not yet been processed into a closed ledger
      if (status !== 404 && !String(err.message).includes("404")) {
        logger.warn({ txHash, error: err.message }, "Unexpected error while watching transaction");
      }
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new TransactionTimeoutError(
    `Transaction ${txHash} did not confirm within ${timeoutMs}ms`,
    txHash
  );
}

module.exports = {
  waitForTransactionConfirmation,
  TransactionTimeoutError,
};
