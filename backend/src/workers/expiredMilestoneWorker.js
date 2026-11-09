"use strict";

const { createServiceLogger } = require("../utils/logger");

const defaultLogger = createServiceLogger("expired-milestone-worker");

/**
 * Worker that periodically observes milestone deadlines and detects overdue milestones,
 * notifying clients of their eligibility for milestone cancellation and refund.
 */
class ExpiredMilestoneWorker {
  constructor(options = {}) {
    this.pool = options.pool;
    this.notificationService = options.notificationService;
    this.logger = options.logger || defaultLogger;
    this.timer = null;
    this.pollIntervalMs = options.pollIntervalMs || 60_000; // 1 minute default
    this.isRunning = false;
  }

  /**
   * Scans a list of milestone records or queries the database for overdue milestones.
   *
   * @param {Object} [options]
   * @param {Array<Object>} [options.milestones] - Optional array of milestones for direct scanning/testing
   * @param {number} [options.referenceTimeSeconds] - Optional timestamp (seconds) to compare against
   * @returns {Promise<{
   *   scanned: number,
   *   expiredFound: number,
   *   notified: number,
   *   expiredMilestones: Array<Object>
   * }>}
   */
  async checkExpiredMilestones(options = {}) {
    const nowSec =
      options.referenceTimeSeconds !== undefined
        ? options.referenceTimeSeconds
        : Math.floor(Date.now() / 1000);

    let milestonesToProcess = options.milestones;

    if (!milestonesToProcess && this.pool) {
      try {
        const query = `
          SELECT m.id, m.job_id, m.milestone_index, m.amount, m.deadline, m.status,
                 e.client_address, e.freelancer_address
          FROM milestones m
          JOIN escrows e ON m.job_id = e.job_id
          WHERE m.status = 'pending'
            AND m.deadline IS NOT NULL
            AND m.deadline <= $1
            AND (m.notified_expired IS NULL OR m.notified_expired = FALSE)
        `;
        const res = await this.pool.query(query, [nowSec]);
        milestonesToProcess = res.rows;
      } catch (err) {
        this.logger.error({ err }, "Failed to query expired milestones from database");
        return { scanned: 0, expiredFound: 0, notified: 0, expiredMilestones: [] };
      }
    }

    milestonesToProcess = milestonesToProcess || [];

    const expired = [];
    let notifiedCount = 0;

    for (const m of milestonesToProcess) {
      const deadlineSec = Number(m.deadline);
      const isPending = m.status === "pending" || !m.approved;

      if (deadlineSec && deadlineSec <= nowSec && isPending) {
        expired.push(m);

        if (this.notificationService && typeof this.notificationService.notify === "function") {
          try {
            await this.notificationService.notify({
              recipient: m.client_address || m.client,
              type: "MILESTONE_EXPIRED",
              title: "Milestone Deadline Passed",
              message: `Milestone #${m.milestone_index || m.id} for job ${m.job_id} has passed its deadline without completion. You may cancel it to claim a full refund.`,
              data: {
                jobId: m.job_id,
                milestoneId: m.milestone_index || m.id,
                amount: m.amount,
              },
            });
            notifiedCount++;
          } catch (notifErr) {
            this.logger.warn({ err: notifErr, milestoneId: m.id }, "Failed to dispatch notification");
          }
        }
      }
    }

    return {
      scanned: milestonesToProcess.length,
      expiredFound: expired.length,
      notified: notifiedCount,
      expiredMilestones: expired,
    };
  }

  /**
   * Starts periodic polling.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.logger.info(`Expired milestone worker started with interval ${this.pollIntervalMs}ms`);

    this.timer = setInterval(async () => {
      try {
        await this.checkExpiredMilestones();
      } catch (err) {
        this.logger.error({ err }, "Error running periodic expired milestone check");
      }
    }, this.pollIntervalMs);

    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  /**
   * Stops periodic polling.
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    this.logger.info("Expired milestone worker stopped");
  }
}

module.exports = ExpiredMilestoneWorker;
