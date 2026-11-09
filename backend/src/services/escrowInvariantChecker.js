"use strict";

const { createServiceLogger } = require("../utils/logger");

const logger = createServiceLogger("escrow-invariant-checker");

const STATUS_MAP = {
  CREATED: "Created",
  IN_PROGRESS: "InProgress",
  COMPLETED: "Completed",
  REFUNDED: "Refunded",
  DISPUTED: "Disputed",
};

/**
 * Service to verify mathematical and state invariants between local database records
 * and Soroban on-chain smart contract storage.
 */
class EscrowInvariantChecker {
  constructor(options = {}) {
    this.logger = options.logger || logger;
  }

  /**
   * Compares local database escrow record with on-chain Soroban escrow state.
   *
   * @param {Object} local - Local database escrow/job record
   * @param {Object} onChain - On-chain escrow contract state
   * @returns {{ isSynchronized: boolean, drifts: Array<Object>, summary: Object }}
   */
  compareStates(local, onChain) {
    const drifts = [];

    if (!local || !onChain) {
      drifts.push({
        field: "existence",
        local: Boolean(local),
        onChain: Boolean(onChain),
        severity: "CRITICAL",
        message: "Missing record either in database or on-chain contract",
      });
      return { isSynchronized: false, drifts, summary: { totalDrifts: 1 } };
    }

    // 1. Status consistency
    const expectedOnChainStatus =
      STATUS_MAP[local.status?.toUpperCase()] || local.status;
    const actualOnChainStatus = onChain.status;

    if (expectedOnChainStatus && actualOnChainStatus && expectedOnChainStatus !== actualOnChainStatus) {
      drifts.push({
        field: "status",
        local: local.status,
        onChain: actualOnChainStatus,
        severity: "CRITICAL",
        message: `Status mismatch: DB is "${local.status}" but contract is "${actualOnChainStatus}"`,
      });
    }

    // 2. Financial Amount / Balance Conservation
    const localTotal = BigInt(local.totalAmountStroops || "0");
    const onChainTotal = BigInt(onChain.totalAmount || "0");
    if (localTotal !== onChainTotal) {
      drifts.push({
        field: "totalAmount",
        local: localTotal.toString(),
        onChain: onChainTotal.toString(),
        severity: "CRITICAL",
        message: "Total escrow funding amount mismatch",
      });
    }

    const localReleased = BigInt(local.releasedAmountStroops || "0");
    const onChainReleased = BigInt(onChain.releasedAmount || "0");
    if (localReleased !== onChainReleased) {
      drifts.push({
        field: "releasedAmount",
        local: localReleased.toString(),
        onChain: onChainReleased.toString(),
        severity: "CRITICAL",
        message: "Released payment amount mismatch",
      });
    }

    // 3. Address integrity
    if (local.clientAddress && onChain.client && local.clientAddress !== onChain.client) {
      drifts.push({
        field: "clientAddress",
        local: local.clientAddress,
        onChain: onChain.client,
        severity: "CRITICAL",
        message: "Client wallet address mismatch",
      });
    }

    if (local.freelancerAddress && onChain.freelancer && local.freelancerAddress !== onChain.freelancer) {
      drifts.push({
        field: "freelancerAddress",
        local: local.freelancerAddress,
        onChain: onChain.freelancer,
        severity: "CRITICAL",
        message: "Freelancer wallet address mismatch",
      });
    }

    // 4. Milestone approvals check
    if (Array.isArray(local.milestones) && Array.isArray(onChain.milestones)) {
      for (const lm of local.milestones) {
        const om = onChain.milestones.find((m) => m.id === lm.id);
        if (om) {
          if (Boolean(lm.approved) !== Boolean(om.approved)) {
            drifts.push({
              field: `milestone_${lm.id}_approved`,
              local: Boolean(lm.approved),
              onChain: Boolean(om.approved),
              severity: "WARNING",
              message: `Milestone #${lm.id} approval state drift`,
            });
          }
        }
      }
    }

    const isSynchronized = drifts.length === 0;

    if (!isSynchronized) {
      this.logger.warn({
        event: "escrow_invariant_drift_detected",
        jobId: local.jobId || onChain.jobId,
        driftsCount: drifts.length,
      });
    }

    return {
      isSynchronized,
      drifts,
      summary: {
        totalDrifts: drifts.length,
        criticalDrifts: drifts.filter((d) => d.severity === "CRITICAL").length,
        checkedAt: new Date().toISOString(),
      },
    };
  }
}

const defaultChecker = new EscrowInvariantChecker();

module.exports = {
  EscrowInvariantChecker,
  defaultChecker,
  STATUS_MAP,
};
