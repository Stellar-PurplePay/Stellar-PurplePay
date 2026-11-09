"use strict";

const { EscrowInvariantChecker } = require("./escrowInvariantChecker");

describe("EscrowInvariantChecker", () => {
  let checker;

  beforeEach(() => {
    checker = new EscrowInvariantChecker();
  });

  const validLocal = {
    jobId: "job-101",
    status: "IN_PROGRESS",
    clientAddress: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3IF53G4J7734",
    freelancerAddress: "GBZH7S6HV22Q725U4FOWEELX66B62M5F7V3GZ7F4GVR5F4ZJFF34X7LM",
    totalAmountStroops: "100000000",
    releasedAmountStroops: "40000000",
    milestones: [
      { id: 1, approved: true },
      { id: 2, approved: false },
    ],
  };

  const matchingOnChain = {
    jobId: "job-101",
    status: "InProgress",
    client: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3IF53G4J7734",
    freelancer: "GBZH7S6HV22Q725U4FOWEELX66B62M5F7V3GZ7F4GVR5F4ZJFF34X7LM",
    totalAmount: 100000000n,
    releasedAmount: 40000000n,
    milestones: [
      { id: 1, approved: true },
      { id: 2, approved: false },
    ],
  };

  it("returns isSynchronized: true when local and on-chain states perfectly match", () => {
    const result = checker.compareStates(validLocal, matchingOnChain);

    expect(result.isSynchronized).toBe(true);
    expect(result.drifts).toHaveLength(0);
    expect(result.summary.criticalDrifts).toBe(0);
  });

  it("detects status drift between database and contract", () => {
    const driftedLocal = { ...validLocal, status: "IN_PROGRESS" };
    const onChainCompleted = { ...matchingOnChain, status: "Completed" };

    const result = checker.compareStates(driftedLocal, onChainCompleted);

    expect(result.isSynchronized).toBe(false);
    expect(result.drifts.some((d) => d.field === "status")).toBe(true);
    expect(result.summary.criticalDrifts).toBe(1);
  });

  it("detects released amount drift between local and contract", () => {
    const driftedOnChain = { ...matchingOnChain, releasedAmount: 60000000n };

    const result = checker.compareStates(validLocal, driftedOnChain);

    expect(result.isSynchronized).toBe(false);
    expect(result.drifts.some((d) => d.field === "releasedAmount")).toBe(true);
  });

  it("detects address discrepancies", () => {
    const mismatchedOnChain = {
      ...matchingOnChain,
      client: "GCO7A2633C4Z4B5MYV4U2EWBJFXTYV5P7ZDFH6Q46L76FDFH6GZYYZ3X",
    };

    const result = checker.compareStates(validLocal, mismatchedOnChain);

    expect(result.isSynchronized).toBe(false);
    expect(result.drifts.some((d) => d.field === "clientAddress")).toBe(true);
  });

  it("detects milestone approval drift as warning", () => {
    const driftedLocalMilestones = {
      ...validLocal,
      milestones: [
        { id: 1, approved: true },
        { id: 2, approved: true }, // local claims approved, but on-chain is false
      ],
    };

    const result = checker.compareStates(driftedLocalMilestones, matchingOnChain);

    expect(result.isSynchronized).toBe(false);
    expect(result.drifts.some((d) => d.field === "milestone_2_approved")).toBe(true);
    expect(result.drifts[0].severity).toBe("WARNING");
  });

  it("handles missing record on either side cleanly", () => {
    const result = checker.compareStates(null, matchingOnChain);

    expect(result.isSynchronized).toBe(false);
    expect(result.drifts[0].field).toBe("existence");
  });
});
