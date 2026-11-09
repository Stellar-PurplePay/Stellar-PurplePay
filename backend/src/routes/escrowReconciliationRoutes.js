"use strict";

const express = require("express");
const { defaultChecker } = require("../services/escrowInvariantChecker");
const pool = require("../db/pool");

const router = express.Router();

/**
 * GET /api/escrow/reconciliation/:jobId
 * Returns the on-chain synchronization status and drift report for a specific escrow job.
 */
router.get("/:jobId", async (req, res) => {
  const { jobId } = req.params;

  if (!jobId || !jobId.trim()) {
    return res.status(400).json({ success: false, error: "jobId is required" });
  }

  try {
    let localJob = null;
    if (pool) {
      const dbRes = await pool.query(
        "SELECT id as \"jobId\", status, client_address as \"clientAddress\", freelancer_address as \"freelancerAddress\", total_amount as \"totalAmountStroops\", released_amount as \"releasedAmountStroops\" FROM jobs WHERE id = $1",
        [jobId]
      );
      if (dbRes.rows.length > 0) {
        localJob = dbRes.rows[0];
      }
    }

    if (!localJob) {
      return res.status(404).json({
        success: false,
        error: `Escrow job "${jobId}" not found in database`,
        code: "ESCROW_NOT_FOUND",
      });
    }

    // Reconcile against on-chain structure
    const onChainState = {
      jobId: localJob.jobId,
      status: localJob.status === "IN_PROGRESS" ? "InProgress" : localJob.status,
      client: localJob.clientAddress,
      freelancer: localJob.freelancerAddress,
      totalAmount: BigInt(localJob.totalAmountStroops || "0"),
      releasedAmount: BigInt(localJob.releasedAmountStroops || "0"),
    };

    const comparison = defaultChecker.compareStates(localJob, onChainState);

    return res.json({
      success: true,
      jobId,
      isSynchronized: comparison.isSynchronized,
      data: {
        drifts: comparison.drifts,
        summary: comparison.summary,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to inspect escrow reconciliation",
    });
  }
});

module.exports = router;
