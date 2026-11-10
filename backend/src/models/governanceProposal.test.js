"use strict";

const {
  GovernanceProposal,
  PROPOSAL_STATUS,
} = require("./governanceProposal");

describe("GovernanceProposal model", () => {
  const validWasmHash = "111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000";
  const baseParams = {
    id: "prop-101",
    targetContract: "CCONTRACTADDRESS1234567890ABCDEF",
    newWasmHash: validWasmHash,
    proposer: "GALICE1234567890ABCDEF",
    requiredSignatures: 2,
    timelockDelaySeconds: 86400,
  };

  it("initializes proposal with default PROPOSED status", () => {
    const proposal = new GovernanceProposal(baseParams);
    expect(proposal.id).toBe("prop-101");
    expect(proposal.status).toBe(PROPOSAL_STATUS.PROPOSED);
    expect(proposal.newWasmHash).toBe(validWasmHash);
  });

  it("validates required parameters on initialization", () => {
    expect(() => new GovernanceProposal({ ...baseParams, id: "" })).toThrow(
      "Proposal ID is required"
    );
    expect(
      () => new GovernanceProposal({ ...baseParams, targetContract: "" })
    ).toThrow("Target contract address is required");
    expect(
      () => new GovernanceProposal({ ...baseParams, newWasmHash: "invalid" })
    ).toThrow("Valid 64-character hex newWasmHash is required");
  });

  it("transitions to STAGED automatically when required signatures are collected", () => {
    const proposal = new GovernanceProposal(baseParams);
    expect(proposal.status).toBe(PROPOSAL_STATUS.PROPOSED);

    proposal.addSignature("GADMIN1", "sig111");
    expect(proposal.status).toBe(PROPOSAL_STATUS.PROPOSED);
    expect(proposal.signatures.size).toBe(1);

    proposal.addSignature("GADMIN2", "sig222");
    expect(proposal.status).toBe(PROPOSAL_STATUS.STAGED);
    expect(proposal.signatures.size).toBe(2);
  });

  it("rejects duplicate signatures from the same address", () => {
    const proposal = new GovernanceProposal(baseParams);
    proposal.addSignature("GADMIN1", "sig111");
    expect(() => proposal.addSignature("GADMIN1", "sig999")).toThrow(
      "Signer GADMIN1 has already signed"
    );
  });

  it("allows queuing proposal and sets correct unlockTimestamp", () => {
    const proposal = new GovernanceProposal(baseParams);
    proposal.addSignature("GADMIN1", "sig1");
    proposal.addSignature("GADMIN2", "sig2");

    const now = 1000000;
    proposal.queue(now);
    expect(proposal.status).toBe(PROPOSAL_STATUS.QUEUED);
    expect(proposal.unlockTimestamp).toBe(now + 86400);
  });

  it("prevents execution before timelock matures", () => {
    const proposal = new GovernanceProposal(baseParams);
    proposal.addSignature("GADMIN1", "sig1");
    proposal.addSignature("GADMIN2", "sig2");

    const now = 1000000;
    proposal.queue(now);

    expect(() => proposal.execute(now + 1000)).toThrow(
      "Timelock has not matured"
    );
  });

  it("executes successfully once timelock matures", () => {
    const proposal = new GovernanceProposal(baseParams);
    proposal.addSignature("GADMIN1", "sig1");
    proposal.addSignature("GADMIN2", "sig2");

    const now = 1000000;
    proposal.queue(now);

    proposal.execute(now + 86400);
    expect(proposal.status).toBe(PROPOSAL_STATUS.EXECUTED);
    expect(proposal.executedAt).toBeDefined();
  });

  it("allows cancellation and prevents invalid transitions from terminal states", () => {
    const proposal = new GovernanceProposal(baseParams);
    proposal.cancel("Deprecating upgrade");
    expect(proposal.status).toBe(PROPOSAL_STATUS.CANCELLED);
    expect(proposal.cancelReason).toBe("Deprecating upgrade");

    expect(() => proposal.queue()).toThrow("Invalid status transition");
  });
});

