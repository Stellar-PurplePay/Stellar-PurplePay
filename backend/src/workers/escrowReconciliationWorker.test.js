"use strict";

const { EscrowReconciliationWorker } = require("./escrowReconciliationWorker");

describe("EscrowReconciliationWorker", () => {
  let mockPool;
  let mockOnChainFetcher;

  beforeEach(() => {
    mockPool = {
      query: jest.fn().mockResolvedValue({ rowCount: 1 }),
    };
    mockOnChainFetcher = jest.fn();
  });

  const syncedJob = {
    jobId: "job-sync-1",
    status: "IN_PROGRESS",
    clientAddress: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3IF53G4J7734",
    freelancerAddress: "GBZH7S6HV22Q725U4FOWEELX66B62M5F7V3GZ7F4GVR5F4ZJFF34X7LM",
    totalAmountStroops: "1000",
    releasedAmountStroops: "500",
  };

  const syncedOnChain = {
    jobId: "job-sync-1",
    status: "InProgress",
    client: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3IF53G4J7734",
    freelancer: "GBZH7S6HV22Q725U4FOWEELX66B62M5F7V3GZ7F4GVR5F4ZJFF34X7LM",
    totalAmount: 1000n,
    releasedAmount: 500n,
  };

  it("reports all jobs unchanged when database and on-chain match", async () => {
    mockOnChainFetcher.mockResolvedValue(syncedOnChain);

    const worker = new EscrowReconciliationWorker({
      pool: mockPool,
      onChainFetcher: mockOnChainFetcher,
    });

    const report = await worker.reconcileBatch([syncedJob]);

    expect(report.scanned).toBe(1);
    expect(report.unchanged).toBe(1);
    expect(report.driftsFound).toBe(0);
    expect(report.reconciled).toBe(0);
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it("detects divergence and updates database when on-chain has completed", async () => {
    const completedOnChain = {
      ...syncedOnChain,
      status: "Completed",
    };
    mockOnChainFetcher.mockResolvedValue(completedOnChain);

    const worker = new EscrowReconciliationWorker({
      pool: mockPool,
      onChainFetcher: mockOnChainFetcher,
    });

    const report = await worker.reconcileBatch([syncedJob]);

    expect(report.driftsFound).toBe(1);
    expect(report.reconciled).toBe(1);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE jobs SET status = $1"),
      ["completed", "job-sync-1"]
    );
  });

  it("detects drift but does not mutate DB when dryRun is true", async () => {
    const completedOnChain = { ...syncedOnChain, status: "Completed" };
    mockOnChainFetcher.mockResolvedValue(completedOnChain);

    const worker = new EscrowReconciliationWorker({
      pool: mockPool,
      onChainFetcher: mockOnChainFetcher,
    });

    const report = await worker.reconcileBatch([syncedJob], { dryRun: true });

    expect(report.driftsFound).toBe(1);
    expect(report.reconciled).toBe(0);
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it("handles fetcher errors resiliently", async () => {
    mockOnChainFetcher.mockRejectedValue(new Error("RPC Timeout"));

    const worker = new EscrowReconciliationWorker({
      pool: mockPool,
      onChainFetcher: mockOnChainFetcher,
    });

    const report = await worker.reconcileBatch([syncedJob]);

    expect(report.scanned).toBe(1);
    expect(report.details[0].error).toBe("RPC Timeout");
  });
});

