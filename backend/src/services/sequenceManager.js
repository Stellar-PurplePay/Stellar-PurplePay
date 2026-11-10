"use strict";

const { callWithLimit } = require("../utils/horizonClient");
const { createServiceLogger } = require("../utils/logger");

const logger = createServiceLogger("sequenceManager");

class SequenceSyncError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = "SequenceSyncError";
    this.originalError = originalError;
  }
}

/**
 * Checks if a Horizon submission error is due to a bad sequence number.
 * @param {Error|object} err
 * @returns {boolean}
 */
function isBadSequenceError(err) {
  if (!err) return false;
  const txResultCode =
    err.response?.data?.extras?.result_codes?.transaction ||
    err.data?.extras?.result_codes?.transaction ||
    "";
  if (txResultCode === "tx_bad_seq") return true;

  const msg = String(err.message || "");
  return msg.includes("tx_bad_seq") || msg.includes("bad sequence");
}

/**
 * Loads the latest account state directly from Horizon with fresh sequence number.
 * @param {Horizon.Server} horizonServer
 * @param {string} publicKey
 * @returns {Promise<Horizon.AccountResponse>}
 */
async function loadFreshAccount(horizonServer, publicKey) {
  return callWithLimit(
    () => horizonServer.loadAccount(publicKey),
    "loadFreshAccount"
  );
}

/**
 * Executes a transaction submission with automatic sequence number recovery on tx_bad_seq.
 *
 * @param {Horizon.Server} horizonServer
 * @param {Keypair} keypair
 * @param {Function} buildAndSignTxFn - (account: Horizon.AccountResponse) => Promise<Transaction>
 * @param {object} [options]
 * @param {number} [options.maxRetries=3]
 * @returns {Promise<Horizon.HorizonApi.SubmitTransactionResponse>}
 */
async function submitWithSequenceRetry(
  horizonServer,
  keypair,
  buildAndSignTxFn,
  options = {}
) {
  const { maxRetries = 3 } = options;
  const publicKey = keypair.publicKey();

  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    attempt += 1;
    try {
      const account = await loadFreshAccount(horizonServer, publicKey);
      const transaction = await buildAndSignTxFn(account);

      const response = await callWithLimit(
        () => horizonServer.submitTransaction(transaction),
        "submitWithSequenceRetry"
      );

      logger.debug(
        { publicKey, attempt, hash: response.hash },
        "Transaction submitted successfully"
      );
      return response;
    } catch (err) {
      lastError = err;
      if (isBadSequenceError(err) && attempt < maxRetries) {
        logger.warn(
          { publicKey, attempt, maxRetries },
          "Detected tx_bad_seq; refreshing account sequence from Horizon and retrying..."
        );
        continue;
      }
      throw err;
    }
  }

  throw new SequenceSyncError(
    `Failed to submit transaction after ${maxRetries} sequence retries`,
    lastError
  );
}

module.exports = {
  isBadSequenceError,
  loadFreshAccount,
  submitWithSequenceRetry,
  SequenceSyncError,
};
