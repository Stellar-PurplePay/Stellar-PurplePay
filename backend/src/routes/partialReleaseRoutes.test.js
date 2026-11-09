"use strict";

const express = require("express");
const request = require("supertest");
const partialReleaseRoutes = require("./partialReleaseRoutes");

describe("partialReleaseRoutes", () => {
  let app;
  const validClient = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/api/escrow/milestones", partialReleaseRoutes);
  });

  it("returns 200 with breakdown on valid request", async () => {
    const res = await request(app)
      .post("/api/escrow/milestones/partial-release")
      .send({
        jobId: "job-101",
        milestoneId: 1,
        milestoneAmount: "500.0000000",
        alreadyReleased: "100.0000000",
        requestAmount: "200.0000000",
        feeBps: 100,
        clientAddress: validClient,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requestAmount).toBe("200.0000000");
    expect(res.body.data.platformFee).toBe("2.0000000"); // 1% of 200
    expect(res.body.data.freelancerPayout).toBe("198.0000000");
    expect(res.body.data.remainingMilestoneAmount).toBe("200.0000000");
    expect(res.body.data.isFullyCompleted).toBe(false);
  });

  it("returns 400 when amount exceeds remaining milestone balance", async () => {
    const res = await request(app)
      .post("/api/escrow/milestones/partial-release")
      .send({
        jobId: "job-101",
        milestoneId: 1,
        milestoneAmount: "100.0000000",
        alreadyReleased: "80.0000000",
        requestAmount: "50.0000000", // 50 > 20
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("exceeds available milestone balance");
  });

  it("returns 400 when jobId is missing", async () => {
    const res = await request(app)
      .post("/api/escrow/milestones/partial-release")
      .send({
        milestoneId: 1,
        milestoneAmount: "100.0",
        requestAmount: "20.0",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("jobId is required");
  });

  it("acquires distributed lock when acquireLock is true and rejects concurrent requests with 409", async () => {
    const payload = {
      jobId: "job-locked-101",
      milestoneId: 2,
      milestoneAmount: "300.0000000",
      requestAmount: "100.0000000",
      acquireLock: true,
    };

    // First request acquires lock
    const res1 = await request(app)
      .post("/api/escrow/milestones/partial-release")
      .send(payload);

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.headers["x-lock-id"]).toBeDefined();
    const lockId = res1.headers["x-lock-id"];

    // Concurrent second request fails with 409
    const res2 = await request(app)
      .post("/api/escrow/milestones/partial-release")
      .send(payload);

    expect(res2.status).toBe(409);
    expect(res2.body.code).toBe("RESOURCE_LOCKED");

    // Unlock
    const unlockRes = await request(app)
      .post("/api/escrow/milestones/partial-release/unlock")
      .send({ jobId: "job-locked-101", milestoneId: 2, lockId });

    expect(unlockRes.status).toBe(200);
    expect(unlockRes.body.released).toBe(true);

    // Can acquire again after unlock
    const res3 = await request(app)
      .post("/api/escrow/milestones/partial-release")
      .send(payload);

    expect(res3.status).toBe(200);
  });
});
