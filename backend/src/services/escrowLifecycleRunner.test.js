const { EscrowLifecycleRunner, ESCROW_STATES } = require("./escrowLifecycleRunner");

describe("EscrowLifecycleRunner E2E State Transition Simulator", () => {
  const client = "GCLIENTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const freelancer = "GFREELANCERAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const arbitrator = "GARBITRATORAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

  it("should enforce milestone sum matches totalAmount on initialization", () => {
    expect(() => {
      new EscrowLifecycleRunner("job-1", {
        client,
        freelancer,
        totalAmount: 1000,
        milestones: [{ id: 1, amount: 400 }, { id: 2, amount: 500 }],
      });
    }).toThrow(/Milestone sum/);
  });

  it("should successfully execute full happy path: CREATE -> FUND -> START -> DELIVER -> APPROVE -> COMPLETED", () => {
    const runner = new EscrowLifecycleRunner("job-e2e-1", {
      client,
      freelancer,
      arbitrator,
      totalAmount: 1000,
      milestones: [
        { id: 1, description: "Phase 1", amount: 400 },
        { id: 2, description: "Phase 2", amount: 600 },
      ],
    });

    expect(runner.state).toBe(ESCROW_STATES.CREATED);

    runner.fund("tx-hash-12345");
    expect(runner.state).toBe(ESCROW_STATES.FUNDED);

    runner.startWork(freelancer);
    expect(runner.state).toBe(ESCROW_STATES.IN_PROGRESS);

    // Deliverable submission
    runner.submitDeliverable(1, "bafybeicidphase1", freelancer);

    // Approve milestone 1
    const res1 = runner.approveMilestone(1, client);
    expect(res1.releasedAmount).toBe("400");
    expect(res1.state).toBe(ESCROW_STATES.IN_PROGRESS);

    // Deliver & Approve milestone 2
    runner.submitDeliverable(2, "bafybeicidphase2", freelancer);
    const res2 = runner.approveMilestone(2, client);
    expect(res2.releasedAmount).toBe("1000");
    expect(res2.state).toBe(ESCROW_STATES.COMPLETED);

    const snapshot = runner.getState();
    expect(snapshot.state).toBe(ESCROW_STATES.COMPLETED);
    expect(snapshot.historyLength).toBe(8);
  });

  it("should handle arbitration dispute and conservation of funds", () => {
    const runner = new EscrowLifecycleRunner("job-dispute-1", {
      client,
      freelancer,
      arbitrator,
      totalAmount: 1000,
      milestones: [
        { id: 1, amount: 500 },
        { id: 2, amount: 500 },
      ],
    });

    runner.fund("tx-dep");
    runner.startWork(freelancer);
    runner.approveMilestone(1, client); // 500 released, 500 remaining

    runner.raiseDispute(client, "Work incomplete on milestone 2");
    expect(runner.state).toBe(ESCROW_STATES.DISPUTED);

    // Unauthorized arbitrator rejected
    expect(() => {
      runner.resolveDispute("GIMPOSTERAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", 250, 250);
    }).toThrow(/Only designated arbitrator/);

    // Non-conserving awards rejected
    expect(() => {
      runner.resolveDispute(arbitrator, 300, 300); // 600 != 500 remaining
    }).toThrow(/Awards sum/);

    // Valid resolution: 200 to client, 300 to freelancer
    const res = runner.resolveDispute(arbitrator, 200, 300);
    expect(res.state).toBe(ESCROW_STATES.RESOLVED);
    expect(runner.releasedAmount).toBe(800n); // 500 + 300
  });
});
