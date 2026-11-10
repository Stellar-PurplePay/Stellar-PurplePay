"use strict";

const express = require("express");
const request = require("supertest");
const reconciliationRoutes = require("./escrowReconciliationRoutes");
const pool = require("../db/pool");

jest.mock("../db/pool");

describe("Escrow Reconciliation Routes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/escrow/reconciliation", reconciliationRoutes);
  });

  it("returns 404 ESCROW_NOT_FOUND if job does not exist", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/api/escrow/reconciliation/job-999");
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("ESCROW_NOT_FOUND");
  });

  it("returns 200 with sync status on found job", async () => {
    const mockDbJob = {
      jobId: "job-101",
      status: "IN_PROGRESS",
      clientAddress: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3IF53G4J7734",
      freelancerAddress: "GBZH7S6HV22Q725U4FOWEELX66B62M5F7V3GZ7F4GVR5F4ZJFF34X7LM",
      totalAmountStroops: "1000",
      releasedAmountStroops: "0",
    };

    pool.query.mockResolvedValueOnce({ rows: [mockDbJob] });

    const res = await request(app).get("/api/escrow/reconciliation/job-101");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.jobId).toBe("job-101");
    expect(res.body.isSynchronized).toBe(true);
  });

  it("returns 500 when database query throws error", async () => {
    pool.query.mockRejectedValueOnce(new Error("Database disconnected"));

    const res = await request(app).get("/api/escrow/reconciliation/job-error");
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

