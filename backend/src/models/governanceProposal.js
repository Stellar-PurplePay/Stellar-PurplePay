"use strict";

const PROPOSAL_STATUS = Object.freeze({
  PROPOSED: "proposed",
  STAGED: "staged",
  QUEUED: "queued",
  EXECUTED: "executed",
  CANCELLED: "cancelled",
  REJECTED: "rejected",
});

const VALID_TRANSITIONS = {
  [PROPOSAL_STATUS.PROPOSED]: [
    PROPOSAL_STATUS.STAGED,
    PROPOSAL_STATUS.REJECTED,
    PROPOSAL_STATUS.CANCELLED,
  ],
  [PROPOSAL_STATUS.STAGED]: [
    PROPOSAL_STATUS.QUEUED,
    PROPOSAL_STATUS.CANCELLED,
  ],
  [PROPOSAL_STATUS.QUEUED]: [
    PROPOSAL_STATUS.EXECUTED,
    PROPOSAL_STATUS.CANCELLED,
  ],
  [PROPOSAL_STATUS.EXECUTED]: [],
  [PROPOSAL_STATUS.CANCELLED]: [],
  [PROPOSAL_STATUS.REJECTED]: [],
};

const WASM_HASH_REGEX = /^[0-9a-fA-F]{64}$/;

class GovernanceProposal {
  constructor(params = {}) {
    if (!params.id) {
      throw new Error("Proposal ID is required");
    }
    if (!params.targetContract) {
      throw new Error("Target contract address is required");
    }
    if (!params.newWasmHash || !WASM_HASH_REGEX.test(params.newWasmHash)) {
      throw new Error("Valid 64-character hex newWasmHash is required");
    }

    this.id = String(params.id);
    this.targetContract = params.targetContract;
    this.newWasmHash = params.newWasmHash.toLowerCase();
    this.title = params.title || "Contract Protocol Upgrade";
    this.description = params.description || "";
    this.proposer = params.proposer || "";
    this.timelockDelaySeconds = Number(params.timelockDelaySeconds) || 86400;
    this.requiredSignatures = Number(params.requiredSignatures) || 2;

    this.status = params.status || PROPOSAL_STATUS.PROPOSED;
    this.signatures = new Map(Object.entries(params.signatures || {}));
    this.unlockTimestamp = params.unlockTimestamp || null;
    this.executedAt = params.executedAt || null;
    this.cancelledAt = params.cancelledAt || null;
    this.cancelReason = params.cancelReason || null;
    this.createdAt = params.createdAt || new Date().toISOString();
  }

  transitionTo(newStatus) {
    const allowed = VALID_TRANSITIONS[this.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Invalid status transition: cannot move from ${this.status} to ${newStatus}`
      );
    }
    this.status = newStatus;
  }

  addSignature(signer, signature) {
    if (this.status !== PROPOSAL_STATUS.PROPOSED) {
      throw new Error(`Cannot add signature in ${this.status} status`);
    }
    if (!signer || !signature) {
      throw new Error("Signer address and signature string are required");
    }
    if (this.signatures.has(signer)) {
      throw new Error(`Signer ${signer} has already signed this proposal`);
    }

    this.signatures.set(signer, signature);

    if (this.signatures.size >= this.requiredSignatures) {
      this.transitionTo(PROPOSAL_STATUS.STAGED);
    }
  }

  queue(nowSeconds = Math.floor(Date.now() / 1000)) {
    this.transitionTo(PROPOSAL_STATUS.QUEUED);
    this.unlockTimestamp = nowSeconds + this.timelockDelaySeconds;
  }

  execute(nowSeconds = Math.floor(Date.now() / 1000)) {
    if (this.status !== PROPOSAL_STATUS.QUEUED) {
      throw new Error(`Cannot execute proposal in status ${this.status}`);
    }
    if (!this.unlockTimestamp || nowSeconds < this.unlockTimestamp) {
      throw new Error(
        `Timelock has not matured. Remaining seconds: ${Math.max(0, (this.unlockTimestamp || 0) - nowSeconds)}`
      );
    }

    this.transitionTo(PROPOSAL_STATUS.EXECUTED);
    this.executedAt = new Date(nowSeconds * 1000).toISOString();
  }

  cancel(reason = "Administrative cancellation") {
    this.transitionTo(PROPOSAL_STATUS.CANCELLED);
    this.cancelledAt = new Date().toISOString();
    this.cancelReason = reason;
  }

  toJSON() {
    return {
      id: this.id,
      targetContract: this.targetContract,
      newWasmHash: this.newWasmHash,
      title: this.title,
      description: this.description,
      proposer: this.proposer,
      timelockDelaySeconds: this.timelockDelaySeconds,
      requiredSignatures: this.requiredSignatures,
      currentSignaturesCount: this.signatures.size,
      signatures: Object.fromEntries(this.signatures),
      status: this.status,
      unlockTimestamp: this.unlockTimestamp,
      executedAt: this.executedAt,
      cancelledAt: this.cancelledAt,
      cancelReason: this.cancelReason,
      createdAt: this.createdAt,
    };
  }
}

module.exports = {
  GovernanceProposal,
  PROPOSAL_STATUS,
};

