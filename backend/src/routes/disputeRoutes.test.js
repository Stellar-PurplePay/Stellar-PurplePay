"use strict";

const express = require("express");
const request = require("supertest");
const disputeRoutes = require("./disputeRoutes");
const stellarDisputeService = require("../services/stellarDisputeService");

jest.mock("../services/stellarDisputeService");

describe("disputeRoutes", () => {
  let app;
  const arb1 = "GCGQCFTEFE4W5BNG2QXJN4244ZCQMGLO6G5X65NILEKVLGZTSNZUVHJP";

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/stellar/disputes", disputeRoutes);
  });

  describe("POST /api/stellar/disputes/:jobId/tally", () => {
    it("returns 400 when votes or remainingAmount are missing", async () => {
      const res = await request(app)
        .post("/api/stellar/disputes/job-101/tally")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("'votes' must be an array");
    });

    it("returns 200 and consensus data on success", async () => {
      stellarDisputeService.tallyArbitratorVotes.mockReturnValue({
        hasQuorum: true,
        winningProposal: { clientAward: "70", freelancerAward: "30" },
      });

      const res = await request(app)
        .post("/api/stellar/disputes/job-101/tally")
        .send({
          votes: [{ arbitrator: arb1, client_award: "70", freelancer_award: "30" }],
          remainingAmount: "100",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hasQuorum).toBe(true);
    });
  });

  describe("GET /api/stellar/disputes/:jobId/eligibility", () => {
    it("returns eligibility check boolean", async () => {
      stellarDisputeService.isEligibleForDispute.mockReturnValue(true);

      const res = await request(app)
        .get("/api/stellar/disputes/job-101/eligibility")
        .query({ status: "Disputed" });

      expect(res.status).toBe(200);
      expect(res.body.eligible).toBe(true);
    });
  });
});
