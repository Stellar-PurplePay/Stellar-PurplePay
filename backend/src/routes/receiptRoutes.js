"use strict";

const express = require("express");
const router = express.Router();
const StellarReceiptGenerator = require("../services/stellarReceiptGenerator");

/**
 * POST /api/stellar/receipts/generate
 * Generates a signed, verifiable payment receipt for an escrow payout.
 */
router.post("/generate", (req, res) => {
  try {
    const receipt = StellarReceiptGenerator.generateReceipt(req.body);
    return res.status(200).json({
      success: true,
      data: receipt,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/stellar/receipts/verify
 * Verifies that the provided receipt payload produces the matching cryptographic digest.
 */
router.post("/verify", (req, res) => {
  try {
    const { receipt } = req.body || {};
    if (!receipt || !receipt.digest || !receipt.transaction || !receipt.settlement) {
      return res.status(400).json({
        success: false,
        error: "Invalid receipt payload for verification",
      });
    }

    const recomputed = StellarReceiptGenerator.generateReceipt({
      receiptId: receipt.receiptSerial.replace("RCP-STLR-", ""),
      txHash: receipt.transaction.hash,
      ledgerSequence: receipt.transaction.ledger,
      jobId: receipt.jobId,
      milestoneId: receipt.milestoneId,
      clientAddress: receipt.settlement.payer,
      freelancerAddress: receipt.settlement.payee,
      amount: receipt.settlement.grossAmount,
      asset: receipt.settlement.asset,
      platformFee: receipt.settlement.platformFee,
      network: receipt.network,
      timestamp: receipt.issuedTimestamp,
    });

    const isValid = recomputed.digest === receipt.digest;

    return res.status(200).json({
      success: true,
      data: {
        isValid,
        digest: recomputed.digest,
        receiptSerial: receipt.receiptSerial,
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: `Verification failed: ${err.message}`,
    });
  }
});

module.exports = router;
