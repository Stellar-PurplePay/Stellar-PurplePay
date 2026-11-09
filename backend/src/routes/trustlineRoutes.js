"use strict";

const express = require("express");
const router = express.Router();
const StellarTrustlineService = require("../services/stellarTrustlineService");

const trustlineService = new StellarTrustlineService();

/**
 * GET /api/stellar/trustlines/verify
 * Query params: accountAddress, assetCode, assetIssuer, amount
 */
router.get("/verify", async (req, res) => {
  try {
    const { accountAddress, assetCode, assetIssuer, amount } = req.query;

    if (!accountAddress) {
      return res.status(400).json({
        success: false,
        error: "Query parameter 'accountAddress' is required",
      });
    }

    const result = await trustlineService.verifyTrustline({
      accountAddress: String(accountAddress).trim(),
      assetCode: assetCode ? String(assetCode).trim() : "XLM",
      assetIssuer: assetIssuer ? String(assetIssuer).trim() : undefined,
      amount: amount ? String(amount).trim() : "0",
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `Failed to verify asset trustline: ${err.message}`,
    });
  }
});

/**
 * POST /api/stellar/trustlines/verify
 * Body: { accountAddress, assetCode, assetIssuer, amount }
 */
router.post("/verify", async (req, res) => {
  try {
    const { accountAddress, assetCode, assetIssuer, amount } = req.body || {};

    if (!accountAddress) {
      return res.status(400).json({
        success: false,
        error: "Field 'accountAddress' is required in request body",
      });
    }

    const result = await trustlineService.verifyTrustline({
      accountAddress: String(accountAddress).trim(),
      assetCode: assetCode ? String(assetCode).trim() : "XLM",
      assetIssuer: assetIssuer ? String(assetIssuer).trim() : undefined,
      amount: amount ? String(amount).trim() : "0",
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `Failed to verify asset trustline: ${err.message}`,
    });
  }
});

module.exports = router;
