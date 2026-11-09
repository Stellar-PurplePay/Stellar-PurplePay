const express = require("express");
const request = require("supertest");
const { createAuditLogRouter } = require("./auditLogRoutes");
const { TamperEvidentAuditLogger } = require("../services/tamperEvidentAuditLogger");

describe("AuditLogRoutes", () => {
  let app;
  let logger;

  beforeEach(() => {
    logger = new TamperEvidentAuditLogger();
    app = express();
    app.use(express.json());
    app.use("/api/audit-logs", createAuditLogRouter(logger));
  });

  it("creates audit log entries and verifies them via API", async () => {
    // 1. Post new audit entry
    const postRes = await request(app)
      .post("/api/audit-logs")
      .send({
        action: "ESCROW_CREATED",
        actor: "GCLIENT1",
        jobId: "job-101",
        metadata: { totalAmount: 10000 },
      });

    expect(postRes.status).toBe(201);
    expect(postRes.body.entry.action).toBe("ESCROW_CREATED");
    expect(postRes.body.entry.hash).toHaveLength(64);

    // 2. Query audit logs
    const getRes = await request(app).get("/api/audit-logs?jobId=job-101");
    expect(getRes.status).toBe(200);
    expect(getRes.body.count).toBe(1);
    expect(getRes.body.entries[0].jobId).toBe("job-101");

    // 3. Cryptographic chain verification endpoint
    const verifyRes = await request(app).get("/api/audit-logs/verify");
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.verification.isValid).toBe(true);
  });

  it("validates required payload properties on POST", async () => {
    const res1 = await request(app).post("/api/audit-logs").send({ actor: "GCLIENT1" });
    expect(res1.status).toBe(400);
    expect(res1.body.message).toContain("Action is required");

    const res2 = await request(app).post("/api/audit-logs").send({ action: "TEST" });
    expect(res2.status).toBe(400);
    expect(res2.body.message).toContain("Actor is required");
  });

  it("returns 409 Conflict when chain tampering is detected", async () => {
    logger.logAction("ACTION_1", "ACTOR1", "job-1");
    logger.logAction("ACTION_2", "ACTOR2", "job-2");

    // Mutate entry
    logger.entries[0].action = "TAMPERED_ACTION";

    const verifyRes = await request(app).get("/api/audit-logs/verify");
    expect(verifyRes.status).toBe(409);
    expect(verifyRes.body.success).toBe(false);
    expect(verifyRes.body.error).toBe("AuditLogTamperDetected");
    expect(verifyRes.body.verification.brokenAtIndex).toBe(0);
  });
});
