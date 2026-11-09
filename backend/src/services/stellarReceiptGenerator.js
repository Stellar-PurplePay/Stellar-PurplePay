"use strict";

const crypto = require("crypto");
const StellarSdk = require("@stellar/stellar-sdk");

/**
 * Service to generate verifiable, tamper-evident cryptographic payment receipts
 * for Stellar escrow payouts and settlements.
 */
class StellarReceiptGenerator {
  /**
   * Generates a canonical receipt payload and SHA-256 integrity digest.
   *
   * @param {Object} params
   * @param {number | string} params.receiptId - Monotonic receipt sequence number
   * @param {string} params.txHash - 64-char hex Stellar transaction hash
   * @param {number} [params.ledgerSequence] - Ledger sequence where transaction closed
   * @param {string} params.jobId - Escrow job identifier
   * @param {number} [params.milestoneId=1] - Milestone sequence number
   * @param {string} params.clientAddress - Payer Stellar address (G...)
   * @param {string} params.freelancerAddress - Payee Stellar address (G...)
   * @param {string | number} params.amount - Total amount transferred
   * @param {string} [params.asset='XLM'] - Asset code
   * @param {string | number} [params.platformFee='0'] - Deducted platform fee
   * @param {string} [params.network='testnet'] - Target network ('testnet' | 'mainnet')
   * @param {number} [params.timestamp] - UNIX epoch timestamp in seconds
   * @returns {Object} Structured cryptographic receipt
   */
  static generateReceipt(params) {
    const {
      receiptId = 1,
      txHash,
      ledgerSequence,
      jobId,
      milestoneId = 1,
      clientAddress,
      freelancerAddress,
      amount,
      asset = "XLM",
      platformFee = "0",
      network = "testnet",
      timestamp,
    } = params || {};

    if (!txHash || !/^[0-9a-fA-F]{64}$/.test(txHash)) {
      throw new Error(`Invalid 32-byte hexadecimal transaction hash: "${txHash}"`);
    }

    if (!clientAddress || !StellarSdk.StrKey.isValidEd25519PublicKey(clientAddress)) {
      throw new Error(`Invalid client Stellar address: "${clientAddress}"`);
    }

    if (!freelancerAddress || !StellarSdk.StrKey.isValidEd25519PublicKey(freelancerAddress)) {
      throw new Error(`Invalid freelancer Stellar address: "${freelancerAddress}"`);
    }

    if (!jobId || !String(jobId).trim()) {
      throw new Error("jobId is required");
    }

    const cleanAmount = String(amount).trim();
    if (!cleanAmount || isNaN(Number(cleanAmount)) || Number(cleanAmount) <= 0) {
      throw new Error(`Invalid payment amount: "${amount}"`);
    }

    const nowSec = timestamp !== undefined ? Number(timestamp) : Math.floor(Date.now() / 1000);
    const isoDate = new Date(nowSec * 1000).toISOString();
    const cleanReceiptNum = String(receiptId).padStart(8, "0");
    const receiptSerial = `RCP-STLR-${cleanReceiptNum}`;

    const canonicalString = [
      receiptSerial,
      txHash.toLowerCase(),
      ledgerSequence || 0,
      jobId,
      milestoneId,
      clientAddress,
      freelancerAddress,
      cleanAmount,
      asset.toUpperCase(),
      String(platformFee),
      network,
      nowSec,
    ].join("|");

    const digest = crypto.createHash("sha256").update(canonicalString, "utf8").digest("hex");

    const explorerBase =
      network === "mainnet"
        ? "https://stellar.expert/explorer/public/tx"
        : "https://stellar.expert/explorer/testnet/tx";

    return {
      receiptSerial,
      digest,
      jobId,
      milestoneId: Number(milestoneId),
      network,
      transaction: {
        hash: txHash.toLowerCase(),
        ledger: ledgerSequence ? Number(ledgerSequence) : null,
        explorerUrl: `${explorerBase}/${txHash.toLowerCase()}`,
      },
      settlement: {
        payer: clientAddress,
        payee: freelancerAddress,
        grossAmount: cleanAmount,
        asset: asset.toUpperCase(),
        platformFee: String(platformFee),
      },
      issuedAt: isoDate,
      issuedTimestamp: nowSec,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "PaymentReceipt",
        identifier: receiptSerial,
        paymentMethod: "Stellar Network",
        price: cleanAmount,
        priceCurrency: asset.toUpperCase(),
        paymentDueDate: isoDate,
      },
    };
  }
}

module.exports = StellarReceiptGenerator;
