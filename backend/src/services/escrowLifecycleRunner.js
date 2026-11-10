/**
 * EscrowLifecycleRunner
 * Simulates, validates, and orchestrates end-to-end escrow lifecycle state transitions
 * from initialization, funding, milestone delivery, arbitration disputes, through final payout.
 */

const ESCROW_STATES = {
  CREATED: "CREATED",
  FUNDED: "FUNDED",
  IN_PROGRESS: "IN_PROGRESS",
  DISPUTED: "DISPUTED",
  RESOLVED: "RESOLVED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

class EscrowLifecycleRunner {
  constructor(jobId, config) {
    if (!jobId) throw new Error("jobId is required");
    if (!config?.client || !config?.freelancer || !config?.totalAmount) {
      throw new Error("client, freelancer, and totalAmount are required");
    }

    this.jobId = jobId;
    this.client = config.client;
    this.freelancer = config.freelancer;
    this.arbitrator = config.arbitrator || null;
    this.totalAmount = BigInt(config.totalAmount);
    this.releasedAmount = 0n;
    this.state = ESCROW_STATES.CREATED;
    this.history = [];

    this.milestones = (config.milestones || []).map((m, index) => ({
      id: m.id || index + 1,
      description: m.description,
      amount: BigInt(m.amount),
      approved: false,
      deliverableCid: null,
    }));

    // Verify milestone sum does not exceed total amount
    const sum = this.milestones.reduce((acc, m) => acc + m.amount, 0n);
    if (this.milestones.length > 0 && sum !== this.totalAmount) {
      throw new Error(`Milestone sum (${sum}) must equal totalAmount (${this.totalAmount})`);
    }

    this._record("ESCROW_INITIALIZED", { totalAmount: this.totalAmount.toString() });
  }

  _record(action, details = {}) {
    this.history.push({
      action,
      state: this.state,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  fund(depositTxHash) {
    if (this.state !== ESCROW_STATES.CREATED) {
      throw new Error(`Cannot fund escrow in ${this.state} state`);
    }
    this.state = ESCROW_STATES.FUNDED;
    this._record("ESCROW_FUNDED", { depositTxHash });
    return this.state;
  }

  startWork(freelancer) {
    if (freelancer !== this.freelancer) {
      throw new Error("Only the assigned freelancer can start work");
    }
    if (this.state !== ESCROW_STATES.FUNDED) {
      throw new Error(`Cannot start work in ${this.state} state`);
    }
    this.state = ESCROW_STATES.IN_PROGRESS;
    this._record("WORK_STARTED");
    return this.state;
  }

  submitDeliverable(milestoneId, deliverableCid, caller) {
    if (caller !== this.freelancer) {
      throw new Error("Only the freelancer can submit deliverables");
    }
    if (this.state !== ESCROW_STATES.IN_PROGRESS) {
      throw new Error(`Cannot submit deliverable in ${this.state} state`);
    }

    const milestone = this.milestones.find((m) => m.id === milestoneId);
    if (!milestone) throw new Error(`Milestone ${milestoneId} not found`);
    if (milestone.approved) throw new Error(`Milestone ${milestoneId} is already approved`);

    milestone.deliverableCid = deliverableCid;
    this._record("DELIVERABLE_SUBMITTED", { milestoneId, deliverableCid });
    return milestone;
  }

  approveMilestone(milestoneId, caller) {
    if (caller !== this.client) {
      throw new Error("Only the client can approve milestone releases");
    }
    if (this.state !== ESCROW_STATES.IN_PROGRESS) {
      throw new Error(`Cannot approve milestone in ${this.state} state`);
    }

    const milestone = this.milestones.find((m) => m.id === milestoneId);
    if (!milestone) throw new Error(`Milestone ${milestoneId} not found`);
    if (milestone.approved) throw new Error(`Milestone ${milestoneId} already approved`);

    milestone.approved = true;
    this.releasedAmount += milestone.amount;
    this._record("MILESTONE_APPROVED", {
      milestoneId,
      amount: milestone.amount.toString(),
      releasedTotal: this.releasedAmount.toString(),
    });

    if (this.releasedAmount >= this.totalAmount || this.milestones.every((m) => m.approved)) {
      this.state = ESCROW_STATES.COMPLETED;
      this._record("ESCROW_COMPLETED");
    }

    return {
      releasedAmount: this.releasedAmount.toString(),
      state: this.state,
    };
  }

  raiseDispute(caller, reason) {
    if (caller !== this.client && caller !== this.freelancer) {
      throw new Error("Only parties to the escrow can raise a dispute");
    }
    if (this.state !== ESCROW_STATES.IN_PROGRESS && this.state !== ESCROW_STATES.FUNDED) {
      throw new Error(`Cannot dispute escrow in ${this.state} state`);
    }

    this.state = ESCROW_STATES.DISPUTED;
    this._record("DISPUTE_RAISED", { caller, reason });
    return this.state;
  }

  resolveDispute(arbitrator, clientAward, freelancerAward) {
    if (!this.arbitrator || arbitrator !== this.arbitrator) {
      throw new Error("Only designated arbitrator can resolve dispute");
    }
    if (this.state !== ESCROW_STATES.DISPUTED) {
      throw new Error(`Cannot resolve dispute in ${this.state} state`);
    }

    const cAward = BigInt(clientAward);
    const fAward = BigInt(freelancerAward);
    const remaining = this.totalAmount - this.releasedAmount;

    if (cAward + fAward !== remaining) {
      throw new Error(
        `Awards sum (${cAward + fAward}) must exactly equal remaining balance (${remaining})`
      );
    }

    this.releasedAmount += fAward;
    this.state = ESCROW_STATES.RESOLVED;
    this._record("DISPUTE_RESOLVED", {
      clientAward: cAward.toString(),
      freelancerAward: fAward.toString(),
    });

    return {
      state: this.state,
      clientAward: cAward.toString(),
      freelancerAward: fAward.toString(),
    };
  }

  getState() {
    return {
      jobId: this.jobId,
      state: this.state,
      totalAmount: this.totalAmount.toString(),
      releasedAmount: this.releasedAmount.toString(),
      milestones: this.milestones.map((m) => ({
        ...m,
        amount: m.amount.toString(),
      })),
      historyLength: this.history.length,
    };
  }
}

module.exports = {
  EscrowLifecycleRunner,
  ESCROW_STATES,
};
