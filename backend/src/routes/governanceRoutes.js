"use strict";

const express = require("express");
const router = express.Router();
const { GovernanceProposal } = require("../models/governanceProposal");

// In-memory proposals store for fast consensus & state tracking
const proposalStore = new Map();

/**
 * Reset store (for testing purposes)
 */
function _resetStore() {
  proposalStore.clear();
}

/**
 * GET /api/governance/upgrades
 * List all contract upgrade proposals with optional status filter
 */
router.get("/upgrades", (req, res) => {
  const { status } = req.query;
  let proposals = Array.from(proposalStore.values()).map((p) => p.toJSON());

  if (status) {
    proposals = proposals.filter((p) => p.status === status);
  }

  res.json({
    success: true,
    count: proposals.length,
    proposals,
  });
});

/**
 * GET /api/governance/upgrades/:id
 * Retrieve a specific upgrade proposal
 */
router.get("/upgrades/:id", (req, res) => {
  const proposal = proposalStore.get(req.params.id);
  if (!proposal) {
    return res.status(404).json({
      success: false,
      error: "Upgrade proposal not found",
    });
  }

  res.json({
    success: true,
    proposal: proposal.toJSON(),
  });
});

/**
 * POST /api/governance/upgrades
 * Create a new contract upgrade proposal
 */
router.post("/upgrades", (req, res) => {
  const {
    id,
    targetContract,
    newWasmHash,
    title,
    description,
    proposer,
    timelockDelaySeconds,
    requiredSignatures,
  } = req.body;

  if (!id || !targetContract || !newWasmHash) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: id, targetContract, and newWasmHash are required",
    });
  }

  if (proposalStore.has(id)) {
    return res.status(409).json({
      success: false,
      error: `Proposal with id ${id} already exists`,
    });
  }

  try {
    const proposal = new GovernanceProposal({
      id,
      targetContract,
      newWasmHash,
      title,
      description,
      proposer,
      timelockDelaySeconds,
      requiredSignatures,
    });

    proposalStore.set(id, proposal);
    res.status(201).json({
      success: true,
      proposal: proposal.toJSON(),
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/governance/upgrades/:id/sign
 * Submit an approval signature for an upgrade proposal
 */
router.post("/upgrades/:id/sign", (req, res) => {
  const proposal = proposalStore.get(req.params.id);
  if (!proposal) {
    return res.status(404).json({
      success: false,
      error: "Upgrade proposal not found",
    });
  }

  const { signer, signature } = req.body;
  if (!signer || !signature) {
    return res.status(400).json({
      success: false,
      error: "signer and signature are required in body",
    });
  }

  try {
    proposal.addSignature(signer, signature);
    res.json({
      success: true,
      proposal: proposal.toJSON(),
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/governance/upgrades/:id/queue
 * Queue staged upgrade to start timelock
 */
router.post("/upgrades/:id/queue", (req, res) => {
  const proposal = proposalStore.get(req.params.id);
  if (!proposal) {
    return res.status(404).json({
      success: false,
      error: "Upgrade proposal not found",
    });
  }

  try {
    proposal.queue();
    res.json({
      success: true,
      proposal: proposal.toJSON(),
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/governance/upgrades/:id/execute
 * Execute proposal once timelock delay has elapsed
 */
router.post("/upgrades/:id/execute", (req, res) => {
  const proposal = proposalStore.get(req.params.id);
  if (!proposal) {
    return res.status(404).json({
      success: false,
      error: "Upgrade proposal not found",
    });
  }

  try {
    proposal.execute();
    res.json({
      success: true,
      proposal: proposal.toJSON(),
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = {
  router,
  _resetStore,
  proposalStore,
};

