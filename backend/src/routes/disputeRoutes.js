"use strict";

const express = require("express");
const stellarDisputeService = require("../services/stellarDisputeService");

const router = express.Router();

/**
 * POST /api/stellar/disputes/:jobId/tally
 * Calculates consensus and quorum across arbitrator votes for an escrow.
 */
router.post("/:jobId/tally", (req, res) => {
  const { jobId } = req.params;
  const { votes, remainingAmount } = req.body;

  if (!jobId || typeof jobId !== "string") {
    return res.status(400).json({ success: false, error: "jobId parameter is required" });
  }

  if (!Array.isArray(votes)) {
    return res.status(400).json({ success: false, error: "'votes' must be an array" });
  }

  if (remainingAmount === undefined || remainingAmount === null) {
    return res.status(400).json({ success: false, error: "'remainingAmount' is required" });
  }

  try {
    const tally = stellarDisputeService.tallyArbitratorVotes(votes, remainingAmount);
    return res.status(200).json({
      success: true,
      jobId,
      data: tally,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/stellar/disputes/:jobId/eligibility?status=Disputed
 * Checks whether an escrow is eligible for dispute adjudication.
 */
router.get("/:jobId/eligibility", (req, res) => {
  const { status } = req.query;
  const isEligible = stellarDisputeService.isEligibleForDispute(status);
  return res.status(200).json({
    success: true,
    eligible: isEligible,
  });
});

module.exports = router;
