"use strict";

const { createServiceLogger } = require("../utils/logger");
const { EscrowInvariantChecker } = require("../services/escrowInvariantChecker");

const defaultLogger = createServiceLogger("escrow-reconciliation-worker");

/**
 * Background worker that detects and resolves state divergence between
 * PostgreSQL database job records and Soroban smart contract on-chain storage.
 */
class EscrowReconciliationWorker {
  constructor(options = {}) {
    this.pool = options.pool || null;
    this.checker = options.checker || new EscrowInvariantChecker();
    this.onChainFetcher = options.onChainFetcher || null;
    this.logger = options.logger || defaultLogger;
    this.pollIntervalMs = options.pollIntervalMs || 120_000; // 2 minutes default
    this.timer = null;
    this.isRunning = false;
  }

  /**
   * Reconciles an array of local escrow jobs with on-chain contract state.
   *
   * @param {Array<Object>} localJobs - Array of local database job records
   * @param {Object} [options]
   * @param {boolean} [options.dryRun=false] - If true, detects drifts without writing updates
   * @returns {Promise<{
   *   scanned: number,
   *   driftsFound: number,
   *   reconciled: number,
   *   unchanged: number,
   *   details: Array<Object>
   * }>}
   */
  async reconcileBatch(localJobs = [], options = {}) {
    const { dryRun = false } = options;
    const details = [];
    let driftsFound = 0;
    let reconciled = 0;
    let unchanged = 0;

    for (const job of localJobs) {
      if (!job || !job.jobId) continue;

      try {
        let onChainState = null;
        if (this.onChainFetcher) {
          onChainState = await this.onChainFetcher(job.jobId);
        }

        const comparison = this.checker.compareStates(job, onChainState);

        if (!comparison.isSynchronized) {
          driftsFound++;
          let wasUpdated = false;

          if (!dryRun) {
            wasUpdated = await this._applyReconciliation(job, onChainState, comparison.drifts);
            if (wasUpdated) reconciled++;
          }

          details.push({
            jobId: job.jobId,
            synchronized: false,
            drifts: comparison.drifts,
            reconciled: wasUpdated,
          });
        } else {
          unchanged++;
          details.push({
            jobId: job.jobId,
            synchronized: true,
            drifts: [],
            reconciled: false,
          });
        }
      } catch (err) {
        this.logger.error(`Error reconciling job "${job.jobId}":`, err.message || err);
        details.push({
          jobId: job.jobId,
          error: err.message,
          synchronized: false,
          reconciled: false,
        });
      }
    }

    return {
      scanned: localJobs.length,
      driftsFound,
      reconciled,
      unchanged,
      details,
    };
  }

  /**
   * Applies corrective updates to database when on-chain state has finalized.
   *
   * @private
   */
  async _applyReconciliation(job, onChainState, drifts) {
    if (!onChainState) return false;

    let updated = false;

    // Auto-update status if on-chain finalized
    const statusDrift = drifts.find((d) => d.field === "status");
    if (statusDrift && this.pool) {
      try {
        let newDbStatus = job.status;
        if (onChainState.status === "Completed") newDbStatus = "completed";
        if (onChainState.status === "Refunded") newDbStatus = "cancelled";
        if (onChainState.status === "Disputed") newDbStatus = "disputed";

        await this.pool.query(
          "UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2",
          [newDbStatus, job.jobId]
        );
        updated = true;
      } catch (err) {
        this.logger.error({ err }, `Failed to update DB status for job ${job.jobId}`);
      }
    }

    return updated;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer = setInterval(async () => {
      // In production, queries active jobs from database
    }, this.pollIntervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }
}

module.exports = { EscrowReconciliationWorker };

