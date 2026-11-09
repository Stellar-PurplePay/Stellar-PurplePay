"use strict";

const express = require("express");
const router = express.Router();
const PartialReleaseService = require("../services/partialReleaseService");
const { defaultLockService } = require("../services/distributedLockService");

const STELLAR_PUBKEY_REGEX = /^G[A-Z0-9]{55}$/;

/**
 * POST /api/escrow/milestones/partial-release
 * Validates and calculates a proposed partial milestone release breakdown.
 * Supports optional distributed locking to prevent concurrent double-spends.
 */
router.post("/partial-release", async (req, res) => {
  const {
    jobId,
    milestoneId,
    milestoneAmount,
    alreadyReleased,
    requestAmount,
    feeBps,
    clientAddress,
    acquireLock,
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

  const lockKey = `escrow:release:${jobId}:${numMilestoneId}`;
  let lockOwnerId = null;

  if (acquireLock) {
    const lock = await defaultLockService.acquire(lockKey, 10000);
    if (!lock.acquired) {
      return res.status(409).json({
        success: false,
        error: "Milestone release is already in progress for this milestone",
        code: "RESOURCE_LOCKED",
      });
    }
    lockOwnerId = lock.ownerId;
    res.setHeader("X-Lock-Id", lockOwnerId);
  }

  const result = PartialReleaseService.calculatePartialRelease({
    milestoneAmount,
    alreadyReleased: alreadyReleased || "0",
    requestAmount,
    feeBps: feeBps || 0,
  });

  if (!result.success) {
    if (lockOwnerId) {
      await defaultLockService.release(lockKey, lockOwnerId);
    }
    return res.status(400).json({ success: false, error: result.error });
  }

  return res.status(200).json({
    success: true,
    data: {
      jobId,
      milestoneId: numMilestoneId,
      ...result,
      lockId: lockOwnerId,
      timestamp: Math.floor(Date.now() / 1000),
    },
  });
});

/**
 * POST /api/escrow/milestones/partial-release/unlock
 * Manually releases an acquired milestone lock upon successful on-chain settlement or abort.
 */
router.post("/partial-release/unlock", async (req, res) => {
  const { jobId, milestoneId, lockId } = req.body || {};
  if (!jobId || !milestoneId || !lockId) {
    return res.status(400).json({
      success: false,
      error: "jobId, milestoneId, and lockId are required",
    });
  }

  const lockKey = `escrow:release:${jobId}:${Number(milestoneId)}`;
  const released = await defaultLockService.release(lockKey, lockId);

  return res.json({ success: true, released });
});

module.exports = router;
