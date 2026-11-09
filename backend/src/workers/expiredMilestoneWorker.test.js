"use strict";

const ExpiredMilestoneWorker = require("./expiredMilestoneWorker");

describe("ExpiredMilestoneWorker", () => {
  const dummyMilestones = [
    {
      id: 1,
      job_id: "job-101",
      milestone_index: 1,
      amount: "250.0000000",
      deadline: 1700000000, // past
      status: "pending",
      client_address: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    },
    {
      id: 2,
      job_id: "job-101",
      milestone_index: 2,
      amount: "500.0000000",
      deadline: 1800000000, // future
      status: "pending",
      client_address: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    },
    {
      id: 3,
      job_id: "job-102",
      milestone_index: 1,
      amount: "100.0000000",
      deadline: 1690000000, // past but approved
      status: "approved",
      approved: true,
      client_address: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    },
  ];

  it("identifies past unapproved milestones as expired", async () => {
    const notifyMock = jest.fn().mockResolvedValue(true);
    const worker = new ExpiredMilestoneWorker({
      notificationService: { notify: notifyMock },
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    });

    const res = await worker.checkExpiredMilestones({
      milestones: dummyMilestones,
      referenceTimeSeconds: 1750000000,
    });

    expect(res.scanned).toBe(3);
    expect(res.expiredFound).toBe(1);
    expect(res.notified).toBe(1);
    expect(res.expiredMilestones[0].id).toBe(1);
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "MILESTONE_EXPIRED",
        recipient: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      })
    );
  });

  it("handles empty milestone array gracefully", async () => {
    const worker = new ExpiredMilestoneWorker();
    const res = await worker.checkExpiredMilestones({ milestones: [] });
    expect(res.scanned).toBe(0);
    expect(res.expiredFound).toBe(0);
    expect(res.notified).toBe(0);
  });

  it("queries pool when database pool is supplied", async () => {
    const poolMock = {
      query: jest.fn().mockResolvedValue({
        rows: [dummyMilestones[0]],
      }),
    };

    const worker = new ExpiredMilestoneWorker({
      pool: poolMock,
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    });

    const res = await worker.checkExpiredMilestones({
      referenceTimeSeconds: 1750000000,
    });

    expect(poolMock.query).toHaveBeenCalledTimes(1);
    expect(res.expiredFound).toBe(1);
  });

  it("can start and stop without errors", () => {
    const worker = new ExpiredMilestoneWorker({ pollIntervalMs: 5000 });
    expect(worker.isRunning).toBe(false);
    worker.start();
    expect(worker.isRunning).toBe(true);
    worker.stop();
    expect(worker.isRunning).toBe(false);
  });
});
