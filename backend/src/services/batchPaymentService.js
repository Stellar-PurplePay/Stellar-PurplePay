"use strict";

const {
  TransactionBuilder,
  Operation,
  Asset,
  StrKey,
} = require("@stellar/stellar-sdk");
const { createServiceLogger } = require("../utils/logger");

const logger = createServiceLogger("batchPaymentService");

const MAX_STELLAR_OPS_PER_TX = 100;

class BatchPaymentError extends Error {
  constructor(message, report = {}) {
    super(message);
    this.name = "BatchPaymentError";
    this.report = report;
  }
}

/**
 * Splits an array into chunks of maximum size.
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Validates an array of payment items before batch execution.
 * @param {Array<{ destination: string, amount: string|number, asset?: Asset }>} payments
 */
function validatePaymentItems(payments) {
  if (!Array.isArray(payments) || payments.length === 0) {
    throw new Error("payments must be a non-empty array");
  }

  for (let i = 0; i < payments.length; i += 1) {
    const p = payments[i];
    if (!p.destination || !StrKey.isValidEd25519PublicKey(p.destination)) {
      throw new Error(`Item ${i}: Invalid destination address '${p?.destination}'`);
    }
    const amt = parseFloat(p.amount);
    if (isNaN(amt) || amt <= 0) {
      throw new Error(`Item ${i}: Amount must be a positive number`);
    }
  }
}

/**
 * Executes a large batch of payments across chunked Stellar transactions.
 *
 * @param {object} params
 * @param {Array<{ destination: string, amount: string, asset?: Asset }>} params.payments
 * @param {Keypair} params.sourceKeypair
 * @param {Horizon.Server} params.horizonServer
 * @param {string} params.networkPassphrase
 * @param {number} [params.maxOpsPerChunk=100]
 * @returns {Promise<{ successfulChunks: number, totalPayments: number, txHashes: string[] }>}
 */
async function executeBatchPayments({
  payments,
  sourceKeypair,
  horizonServer,
  networkPassphrase,
  maxOpsPerChunk = MAX_STELLAR_OPS_PER_TX,
}) {
  validatePaymentItems(payments);

  const chunkLimit = Math.min(Math.max(1, maxOpsPerChunk), MAX_STELLAR_OPS_PER_TX);
  const chunks = chunkArray(payments, chunkLimit);
  const txHashes = [];

  logger.info(
    { totalPayments: payments.length, chunkCount: chunks.length, chunkLimit },
    "Starting chunked batch payment processing"
  );

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx += 1) {
    const chunk = chunks[chunkIdx];
    try {
      const account = await horizonServer.loadAccount(sourceKeypair.publicKey());
      const txBuilder = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase,
      });

      for (const item of chunk) {
        txBuilder.addOperation(
          Operation.payment({
            destination: item.destination,
            asset: item.asset || Asset.native(),
            amount: String(item.amount),
          })
        );
      }

      const tx = txBuilder.setTimeout(180).build();
      tx.sign(sourceKeypair);

      const submitRes = await horizonServer.submitTransaction(tx);
      txHashes.push(submitRes.hash);

      logger.info(
        { chunkIdx, opsInChunk: chunk.length, hash: submitRes.hash },
        "Batch chunk submitted successfully"
      );
    } catch (err) {
      const report = {
        totalPayments: payments.length,
        successfulChunks: chunkIdx,
        failedChunkIndex: chunkIdx,
        txHashes,
        error: err.message,
      };
      logger.error(report, "Batch payment chunk failed");
      throw new BatchPaymentError(`Batch failed at chunk ${chunkIdx}: ${err.message}`, report);
    }
  }

  return {
    successfulChunks: chunks.length,
    totalPayments: payments.length,
    txHashes,
  };
}

module.exports = {
  executeBatchPayments,
  chunkArray,
  validatePaymentItems,
  MAX_STELLAR_OPS_PER_TX,
  BatchPaymentError,
};
