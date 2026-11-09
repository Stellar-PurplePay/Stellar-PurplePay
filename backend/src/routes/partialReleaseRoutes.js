"use strict";

const express = require("express");
const router = express.Router();
const PartialReleaseService = require("../services/partialReleaseService");

const STELLAR_PUBKEY_REGEX = /^G[A-Z0-9]{55}$/;

/**
 * POST /api/escrow/milestones/partial-release
 * Validates and calculates a proposed partial milestone release breakdown.
 */
router.post("/partial-release", (req, res) => {
  const {
    jobId,
    milestoneId,
    milestoneAmount,
    alreadyReleased,
    requestAmount,
    feeBps,
    clientAddress,
  } = req.body || {};

  if (!jobId || typeof jobId !== "string" || !jobId.trim()) {
    return res.status(400).json({ success: false, error: "jobId is required" });
  }

  const numMilestoneId = Number(milestoneId);
  if (!Number.isInteger(numMilestoneId) || numMilestoneId <= 0) {
    return res.status(400).json({ success: false, error: "milestoneId must be a positive integer" });
  }

  if (clientAddress && !STELLAR_PUBKEY_REGEX.test(clientAddress)) {
    return res.status(400).json({ success: false, error: "Invalid client Stellar address" });
  }

  const result = PartialReleaseService.calculatePartialRelease({
    milestoneAmount,
    alreadyReleased: alreadyReleased || "0",
    requestAmount,
    feeBps: feeBps || 0,
  });

  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }

  return res.status(200).json({
    success: true,
    data: {
      jobId,
      milestoneId: numMilestoneId,
      ...result,
      timestamp: Math.floor(Date.now() / 1000),
    },
  });
});

module.exports = router;
