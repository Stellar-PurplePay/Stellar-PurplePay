"use strict";

const express = require("express");
const stellarRpcHealthCheck = require("../services/stellarRpcHealthCheck");

const router = express.Router();

/**
 * GET /api/health/stellar
 * Returns live status, latency, and ledger sequence of connected Soroban RPC and Horizon nodes.
 */
router.get("/stellar", async (req, res) => {
  try {
    const health = await stellarRpcHealthCheck.getCombinedHealth();
    const httpStatus = health.status === "unhealthy" ? 503 : 200;
    return res.status(httpStatus).json(health);
  } catch (err) {
    return res.status(500).json({
      status: "unhealthy",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
