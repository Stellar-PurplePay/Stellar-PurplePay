"use strict";

const express = require("express");
const router = express.Router();
const StellarSdk = require("@stellar/stellar-sdk");
const StellarPaymentStreamer = require("../services/stellarPaymentStreamer");

const streamer = new StellarPaymentStreamer();

/**
 * GET /api/stellar/stream/payments/:address
 * SSE endpoint streaming real-time payments for a specific Stellar account.
 */
router.get("/payments/:address", (req, res) => {
  const { address } = req.params;
  const { cursor } = req.query;

  if (!address || !StellarSdk.StrKey.isValidEd25519PublicKey(address)) {
    return res.status(400).json({
      success: false,
      error: "Invalid Stellar account address for payment streaming (expected valid G... key)",
    });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (res.flushHeaders) {
    res.flushHeaders();
  }

  // Send initial connection acknowledgement
  res.write(`event: connected\ndata: ${JSON.stringify({ address, status: "connected" })}\n\n`);

  let subscription = null;
  try {
    subscription = streamer.subscribeAccountPayments(
      address,
      (payment) => {
        res.write(`data: ${JSON.stringify(payment)}\n\n`);
      },
      {
        cursor: cursor ? String(cursor) : "now",
        onError: (err) => {
          res.write(
            `event: error\ndata: ${JSON.stringify({ error: err.message || "Stream error" })}\n\n`
          );
        },
      }
    );
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `Failed to initialize payment stream: ${err.message}`,
    });
  }

  req.on("close", () => {
    if (subscription && typeof subscription.close === "function") {
      subscription.close();
    }
    res.end();
  });
});

module.exports = router;
