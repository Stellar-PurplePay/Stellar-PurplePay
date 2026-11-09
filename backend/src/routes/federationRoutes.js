"use strict";

const express = require("express");
const {
  resolveFederatedAddress,
  reverseResolveFederatedAddress,
  FEDERATION_PATTERN,
} = require("../services/stellarFederationService");
const { StrKey } = require("@stellar/stellar-sdk");

const router = express.Router();

/**
 * GET /api/stellar/federation/resolve?address=alice*example.com
 * Resolves a SEP-0002 federated address into an Ed25519 public key and optional memo.
 */
router.get("/resolve", async (req, res) => {
  const { address } = req.query;

  if (!address || typeof address !== "string" || !FEDERATION_PATTERN.test(address.trim())) {
    return res.status(400).json({
      success: false,
      error: "Invalid or missing 'address' query parameter. Expected user*domain.tld",
    });
  }

  try {
    const result = await resolveFederatedAddress(address.trim());
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/stellar/federation/reverse?account_id=G...&server=https://...
 * Reverse-resolves an Ed25519 account ID to a federated handle via federation server.
 */
router.get("/reverse", async (req, res) => {
  const { account_id, server } = req.query;

  if (!account_id || !StrKey.isValidEd25519PublicKey(account_id)) {
    return res.status(400).json({
      success: false,
      error: "Invalid or missing 'account_id' query parameter. Must be valid Ed25519 public key.",
    });
  }

  if (!server || typeof server !== "string") {
    return res.status(400).json({
      success: false,
      error: "Missing 'server' query parameter.",
    });
  }

  try {
    const result = await reverseResolveFederatedAddress(account_id, server);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;
