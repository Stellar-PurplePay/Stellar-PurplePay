"use strict";

const express = require("express");
const request = require("supertest");
const { router, _resetStore } = require("./governanceRoutes");

describe("governanceRoutes API", () => {
  let app;
  const validHash = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

  beforeEach(() => {
    _resetStore();
    app = express();
    app.use(express.json());
    app.use("/api/governance", router);
  });

  it("lists empty proposals initially", async () => {
    const res = await request(app).get("/api/governance/upgrades");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(0);
    expect(res.body.proposals).toEqual([]);
  });

  it("creates a new upgrade proposal", async () => {
    const res = await request(app)
      .post("/api/governance/upgrades")
      .send({
        id: "prop-upgrade-1",
        targetContract: "CCONTRACT123",
        newWasmHash: validHash,
        title: "Protocol V2",
        proposer: "GADMIN1",
        timelockDelaySeconds: 86400,
        requiredSignatures: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.proposal.id).toBe("prop-upgrade-1");
    expect(res.body.proposal.status).toBe("proposed");
  });

  it("rejects proposal creation with missing fields", async () => {
    const res = await request(app)
      .post("/api/governance/upgrades")
      .send({
        id: "prop-bad",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("handles multi-sig signing and staging workflow", async () => {
    // 1. Create proposal
    await request(app)
      .post("/api/governance/upgrades")
      .send({
        id: "prop-ms-1",
        targetContract: "CCONTRACT123",
        newWasmHash: validHash,
        requiredSignatures: 2,
      });

    // 2. First signature
    const sig1Res = await request(app)
      .post("/api/governance/upgrades/prop-ms-1/sign")
      .send({ signer: "GADMIN1", signature: "sig1" });
    expect(sig1Res.status).toBe(200);
    expect(sig1Res.body.proposal.status).toBe("proposed");
    expect(sig1Res.body.proposal.currentSignaturesCount).toBe(1);

    // 3. Second signature -> auto advances to staged
    const sig2Res = await request(app)
      .post("/api/governance/upgrades/prop-ms-1/sign")
      .send({ signer: "GADMIN2", signature: "sig2" });
    expect(sig2Res.status).toBe(200);
    expect(sig2Res.body.proposal.status).toBe("staged");
    expect(sig2Res.body.proposal.currentSignaturesCount).toBe(2);

    // 4. Queue upgrade
    const queueRes = await request(app).post(
      "/api/governance/upgrades/prop-ms-1/queue"
    );
    expect(queueRes.status).toBe(200);
    expect(queueRes.body.proposal.status).toBe("queued");
    expect(queueRes.body.proposal.unlockTimestamp).toBeDefined();

    // 5. Premature execution fails
    const execRes = await request(app).post(
      "/api/governance/upgrades/prop-ms-1/execute"
    );
    expect(execRes.status).toBe(400);
    expect(execRes.body.error).toContain("Timelock has not matured");

    // 6. Query filtered by status
    const listRes = await request(app).get(
      "/api/governance/upgrades?status=queued"
    );
    expect(listRes.status).toBe(200);
    expect(listRes.body.count).toBe(1);
    expect(listRes.body.proposals[0].id).toBe("prop-ms-1");
  });

  it("returns 404 for non-existent proposal", async () => {
    const res = await request(app).get("/api/governance/upgrades/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

