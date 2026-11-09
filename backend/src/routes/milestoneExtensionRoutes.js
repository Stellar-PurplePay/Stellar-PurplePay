"use strict";

const express = require("express");
const router = express.Router();
const { validateMilestoneExtension } = require("../validators/milestoneExtensionValidator");

/**
 * POST /api/escrow/milestones/extend
 * Extends the deadline for an active milestone.
 */
router.post("/extend", (req, res) => {
  const validation = validateMilestoneExtension(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error,
    });
  }

  const { jobId, milestoneId, extensionSeconds, clientAddress, reason } = validation.data;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const newDeadlineTimestamp = currentTimestamp + extensionSeconds;

  return res.status(200).json({
    success: true,
    data: {
      jobId,
      milestoneId,
      extensionSeconds,
      newDeadlineTimestamp,
      clientAddress,
      reason: reason || null,
      updatedAt: currentTimestamp,
    },
  });
});

module.exports = router;
