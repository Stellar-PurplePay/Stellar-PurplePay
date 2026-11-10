"use strict";

const express = require("express");
const { runSyntheticHealthCheck } = require("../services/syntheticHealthProbe");
const { getMetricsAsText } = require("../metrics/sorobanMetrics");

function createHealthRouter(options = {}) {
  const router = express.Router();
  const pool = options.pool;

  /**
   * GET /health/synthetic
   * Structured diagnostic status across Database, Horizon, and Soroban RPC
   */
  router.get("/synthetic", async (req, res) => {
    try {
      const probeResult = await runSyntheticHealthCheck({
        pool,
        ...options,
      });

      const httpStatus = probeResult.status === "unhealthy" ? 503 : 200;
      res.status(httpStatus).json(probeResult);
    } catch (err) {
      res.status(500).json({
        status: "error",
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}

module.exports = {
  createHealthRouter,
};
