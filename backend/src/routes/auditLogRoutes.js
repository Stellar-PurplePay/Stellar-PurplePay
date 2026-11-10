const express = require("express");
const { defaultAuditLogger } = require("../services/tamperEvidentAuditLogger");

function createAuditLogRouter(logger = defaultAuditLogger) {
  const router = express.Router();

  /**
   * GET /api/audit-logs
   * Query recorded audit logs with optional filters.
   */
  router.get("/", (req, res) => {
    const { jobId, actor, action, limit } = req.query;

    const entries = logger.getEntries({
      jobId: jobId ? String(jobId) : undefined,
      actor: actor ? String(actor) : undefined,
      action: action ? String(action) : undefined,
      limit: limit ? parseInt(String(limit), 10) : undefined,
    });

    return res.status(200).json({
      success: true,
      count: entries.length,
      latestHash: logger.getLatestHash(),
      entries,
    });
  });

  /**
   * GET /api/audit-logs/verify
   * Cryptographically verifies integrity of the entire hash chain.
   */
  router.get("/verify", (req, res) => {
    const verification = logger.verifyChain();

    if (!verification.isValid) {
      return res.status(409).json({
        success: false,
        error: "AuditLogTamperDetected",
        message: "Cryptographic hash chain verification failed. Data tampering detected.",
        verification,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cryptographic hash chain verified successfully. No tampering detected.",
      verification,
    });
  });

  /**
   * POST /api/audit-logs
   * Appends an audit log entry.
   */
  router.post("/", (req, res) => {
    const { action, actor, jobId, metadata } = req.body || {};

    if (!action || typeof action !== "string") {
      return res.status(400).json({
        error: "BadRequest",
        message: "Action is required",
      });
    }
    if (!actor || typeof actor !== "string") {
      return res.status(400).json({
        error: "BadRequest",
        message: "Actor is required",
      });
    }

    const entry = logger.logAction(action, actor, jobId, metadata || {});
    return res.status(201).json({
      success: true,
      entry,
    });
  });

  return router;
}

module.exports = {
  createAuditLogRouter,
};

