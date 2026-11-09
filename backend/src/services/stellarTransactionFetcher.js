"use strict";

const StellarSdk = require("@stellar/stellar-sdk");
const { createServiceLogger } = require("../utils/logger");

const defaultLogger = createServiceLogger("stellar-transaction-fetcher");

/**
 * Service to retrieve and inspect Stellar transactions and their underlying operations from Horizon.
 * Includes memo extraction, fee calculations in Stroops and XLM, and normalized operation summaries.
 */
class StellarTransactionFetcher {
  constructor(options = {}) {
    this.horizonUrl =
      options.horizonUrl ||
      process.env.STELLAR_HORIZON_URL ||
      "https://horizon-testnet.stellar.org";
    this.server = options.server || new StellarSdk.Horizon.Server(this.horizonUrl);
    this.logger = options.logger || defaultLogger;
    this.cache = new Map();
    this.cacheTtlMs = options.cacheTtlMs || 30000; // 30s cache for immutable transactions
  }

  /**
   * Validates whether a string is a 64-character hexadecimal transaction hash.
   *
   * @param {string} hash
   * @returns {boolean}
   */
  isValidTxHash(hash) {
    if (typeof hash !== "string") return false;
    return /^[0-9a-fA-F]{64}$/.test(hash.trim());
  }

  /**
   * Fetches full transaction details including operations breakdown.
   *
   * @param {string} txHash - 64-character hex transaction hash
   * @param {Object} [options]
   * @param {boolean} [options.bypassCache=false]
   * @returns {Promise<Object>}
   */
  async getTransactionDetails(txHash, options = {}) {
    if (!this.isValidTxHash(txHash)) {
      const err = new Error(`Invalid Stellar transaction hash format: "${txHash}"`);
      err.code = "INVALID_TX_HASH";
      err.status = 400;
      throw err;
    }

    const normalizedHash = txHash.trim().toLowerCase();

    // Check cache
    if (!options.bypassCache && this.cache.has(normalizedHash)) {
      const cached = this.cache.get(normalizedHash);
      if (Date.now() - cached.timestamp < this.cacheTtlMs) {
        return cached.data;
      }
      this.cache.delete(normalizedHash);
    }

    try {
      const [txRecord, opsRecord] = await Promise.all([
        this.server.transactions().transaction(normalizedHash).call(),
        this.server.operations().forTransaction(normalizedHash).call(),
      ]);

      const parsedMemo = this._parseMemo(txRecord);
      const feeStroops = Number(txRecord.fee_charged || 0);
      const feeXlm = (feeStroops / 10000000).toFixed(7);

      const operations = (opsRecord.records || []).map((op) => this._normalizeOperation(op));

      const parsedData = {
        hash: txRecord.hash,
        successful: txRecord.successful,
        ledger: txRecord.ledger,
        createdAt: txRecord.created_at,
        sourceAccount: txRecord.source_account,
        feeCharged: {
          stroops: feeStroops,
          xlm: feeXlm,
        },
        maxFee: {
          stroops: Number(txRecord.max_fee || 0),
          xlm: (Number(txRecord.max_fee || 0) / 10000000).toFixed(7),
        },
        operationCount: txRecord.operation_count,
        memo: parsedMemo,
        operations,
        pagingToken: txRecord.paging_token,
      };

      this.cache.set(normalizedHash, {
        timestamp: Date.now(),
        data: parsedData,
      });

      // Bound cache
      if (this.cache.size > 500) {
        const oldest = this.cache.keys().next().value;
        this.cache.delete(oldest);
      }

      return parsedData;
    } catch (err) {
      if (err.response && err.response.status === 404) {
        const notFoundErr = new Error(`Transaction "${normalizedHash}" not found on network`);
        notFoundErr.code = "TRANSACTION_NOT_FOUND";
        notFoundErr.status = 404;
        throw notFoundErr;
      }

      this.logger.error(`Error querying transaction "${normalizedHash}":`, err.message || err);
      throw err;
    }
  }

  /**
   * Helper to parse and structure transaction memos.
   *
   * @private
   */
  _parseMemo(txRecord) {
    if (!txRecord.memo_type || txRecord.memo_type === "none") {
      return { type: "none", value: null };
    }

    return {
      type: txRecord.memo_type,
      value: txRecord.memo,
    };
  }

  /**
   * Normalizes an individual Horizon operation record.
   *
   * @private
   */
  _normalizeOperation(op) {
    const base = {
      id: op.id,
      type: op.type,
      typeI: op.type_i,
      sourceAccount: op.source_account,
      createdAt: op.created_at,
      transactionSuccessful: op.transaction_successful,
    };

    if (op.type === "payment") {
      base.details = {
        from: op.from,
        to: op.to,
        amount: op.amount,
        asset: op.asset_type === "native" ? "XLM" : `${op.asset_code}:${op.asset_issuer}`,
        assetType: op.asset_type,
      };
    } else if (op.type === "invoke_host_function") {
      base.details = {
        function: op.function || "soroban_call",
        parameters: op.parameters || [],
      };
    } else if (op.type === "change_trust") {
      base.details = {
        assetCode: op.asset_code,
        assetIssuer: op.asset_issuer,
        limit: op.limit,
      };
    } else if (op.type === "create_account") {
      base.details = {
        account: op.account,
        startingBalance: op.starting_balance,
        funder: op.funder,
      };
    } else {
      base.details = { ...op };
    }

    return base;
  }
}

module.exports = { StellarTransactionFetcher };
