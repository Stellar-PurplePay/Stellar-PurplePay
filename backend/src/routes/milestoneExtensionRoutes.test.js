"use strict";

const express = require("express");
const request = require("supertest");
const milestoneExtensionRoutes = require("./milestoneExtensionRoutes");

describe("milestoneExtensionRoutes", () => {
  let app;
  const validClient = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/api/escrow/milestones", milestoneExtensionRoutes);
  });

  it("returns 200 with newDeadlineTimestamp on valid payload", async () => {
    const res = await request(app)
      .post("/api/escrow/milestones/extend")
      .send({
        jobId: "job-101",
        milestoneId: 1,
        extensionSeconds: 86400,
        clientAddress: validClient,
        reason: "Revision requested",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.jobId).toBe("job-101");
    expect(res.body.data.milestoneId).toBe(1);
    expect(res.body.data.newDeadlineTimestamp).toBeGreaterThan(Date.now() / 1000);
  });

  it("returns 400 when validation fails", async () => {
    const res = await request(app)
      .post("/api/escrow/milestones/extend")
      .send({
        jobId: "",
        milestoneId: 0,
        extensionSeconds: -100,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });
});
