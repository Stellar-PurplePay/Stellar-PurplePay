"use strict";

const express = require("express");
const { StellarTransactionFetcher } = require("../services/stellarTransactionFetcher");

const router = express.Router();
const fetcher = new StellarTransactionFetcher();

/**
 * GET /api/stellar/transactions/:hash
 * Fetches and parses an on-chain Stellar transaction with fee breakdown, memo, and operations.
 */
router.get("/:hash", async (req, res) => {
  const { hash } = req.params;
  const bypassCache = req.query.bypassCache === "true";

  if (!fetcher.isValidTxHash(hash)) {
    return res.status(400).json({
      error: `Invalid Stellar transaction hash format: "${hash}"`,
      code: "INVALID_TX_HASH",
    });
  }

  try {
    const details = await fetcher.getTransactionDetails(hash, { bypassCache });
    return res.json({
      success: true,
      data: details,
    });
  } catch (err) {
    if (err.code === "TRANSACTION_NOT_FOUND" || err.status === 404) {
      return res.status(404).json({
        error: err.message,
        code: "TRANSACTION_NOT_FOUND",
      });
    }

    return res.status(err.status || 500).json({
      error: err.message || "Failed to inspect on-chain transaction",
      code: err.code || "TRANSACTION_QUERY_FAILED",
    });
  }
});

module.exports = router;
