"use strict";

const StellarSdk = require("@stellar/stellar-sdk");
const { createServiceLogger } = require("../utils/logger");

const defaultLogger = createServiceLogger("stellar-payment-streamer");

/**
 * Service to subscribe to real-time Stellar payments on Horizon via Server-Sent Events (SSE).
 * Provides automatic deduplication of payment events and managed stream lifecycle.
 */
class StellarPaymentStreamer {
  constructor(options = {}) {
    this.horizonUrl =
      options.horizonUrl ||
      process.env.STELLAR_HORIZON_URL ||
      "https://horizon-testnet.stellar.org";
    this.server = options.server || new StellarSdk.Horizon.Server(this.horizonUrl);
    this.logger = options.logger || defaultLogger;
  }

  /**
   * Subscribes to incoming payments for a specific Stellar account.
   *
   * @param {string} accountAddress - Stellar public key (G...)
   * @param {(payment: Object) => void} onPayment - Callback for new incoming payments
   * @param {Object} [options]
   * @param {string} [options.cursor='now'] - Paging cursor
   * @param {(err: Error) => void} [options.onError] - Error callback
   * @returns {{ close: () => void, getStatus: () => string, isSeen: (id: string) => boolean }}
   */
  subscribeAccountPayments(accountAddress, onPayment, options = {}) {
    if (!accountAddress || !StellarSdk.StrKey.isValidEd25519PublicKey(accountAddress)) {
      throw new Error(`Invalid Stellar address for payment streaming: "${accountAddress}"`);
    }
    if (typeof onPayment !== "function") {
      throw new Error("onPayment callback must be a function");
    }

    const cursor = options.cursor || "now";
    const seenIds = new Set();
    let status = "connecting";

    const paymentBuilder = this.server
      .payments()
      .forAccount(accountAddress)
      .cursor(cursor);

    const closeHandler = paymentBuilder.stream({
      onmessage: (record) => {
        status = "connected";

        if (!record || !record.id) return;
        if (seenIds.has(record.id)) {
          return; // Ignore duplicate delivery
        }
        seenIds.add(record.id);
        if (seenIds.size > 2000) {
          // Keep set bounded
          const firstKey = seenIds.values().next().value;
          seenIds.delete(firstKey);
        }

        const normalized = {
          id: record.id,
          type: record.type,
          from: record.from || record.source_account,
          to: record.to || record.account,
          amount: record.amount || "0",
          asset: record.asset_code || "XLM",
          assetIssuer: record.asset_issuer,
          txHash: record.transaction_hash,
          createdAt: record.created_at || new Date().toISOString(),
          pagingToken: record.paging_token,
        };

        try {
          onPayment(normalized);
        } catch (cbErr) {
          this.logger.error({ err: cbErr, paymentId: record.id }, "Error in onPayment callback");
        }
      },
      onerror: (err) => {
        status = "error";
        this.logger.warn({ err, accountAddress }, "Stellar payment stream error received");
        if (typeof options.onError === "function") {
          options.onError(err);
        }
      },
    });

    return {
      close: () => {
        status = "closed";
        if (typeof closeHandler === "function") {
          closeHandler();
        }
      },
      getStatus: () => status,
      isSeen: (id) => seenIds.has(id),
    };
  }
}

module.exports = StellarPaymentStreamer;
