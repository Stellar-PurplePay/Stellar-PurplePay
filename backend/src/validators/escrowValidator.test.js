"use strict";

const {
  validate,
  releaseMilestoneSchema,
  submitDeliverableSchema,
  createEscrowSchema,
  disputeEscrowSchema,
} = require("./escrowValidator");

describe("escrowValidator", () => {
  describe("releaseMilestoneSchema", () => {
    it("accepts valid milestoneIndex", () => {
      const parsed = validate(releaseMilestoneSchema, { milestoneIndex: 2 });
      expect(parsed.milestoneIndex).toBe(2);
    });

    it("rejects negative or out-of-bounds milestoneIndex", () => {
      expect(() => validate(releaseMilestoneSchema, { milestoneIndex: -1 })).toThrow();
      expect(() => validate(releaseMilestoneSchema, { milestoneIndex: 99 })).toThrow();
      expect(() => validate(releaseMilestoneSchema, { milestoneIndex: "abc" })).toThrow();
    });
  });

  describe("submitDeliverableSchema", () => {
    const validHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    it("accepts a valid 64-char hex deliverable hash", () => {
      const parsed = validate(submitDeliverableSchema, {
        milestoneIndex: 0,
        deliverableHash: validHash,
      });
      expect(parsed.deliverableHash).toBe(validHash);
    });

    it("rejects invalid hash length and non-hex characters", () => {
      expect(() =>
        validate(submitDeliverableSchema, {
          milestoneIndex: 0,
          deliverableHash: "short-hash",
        })
      ).toThrow();

      expect(() =>
        validate(submitDeliverableSchema, {
          milestoneIndex: 0,
          deliverableHash: validHash.slice(0, 63) + "Z", // Invalid hex char
        })
      ).toThrow();
    });
  });

  describe("createEscrowSchema", () => {
    const client = "GA" + "A".repeat(54);
    const freelancer = "GB" + "B".repeat(54);

    it("accepts valid escrow parameters with stroop precision", () => {
      const parsed = validate(createEscrowSchema, {
        jobId: "job-101",
        clientAddress: client,
        freelancerAddress: freelancer,
        amount: "150.5000000",
        currency: "XLM",
      });
      expect(parsed.amount).toBe("150.5000000");
    });

    it("rejects excess decimal precision beyond 7 digits", () => {
      expect(() =>
        validate(createEscrowSchema, {
          jobId: "job-101",
          clientAddress: client,
          freelancerAddress: freelancer,
          amount: "10.12345678", // 8 decimals
        })
      ).toThrow();
    });

    it("rejects invalid Stellar addresses", () => {
      expect(() =>
        validate(createEscrowSchema, {
          jobId: "job-101",
          clientAddress: "invalid-key",
          freelancerAddress: freelancer,
          amount: "100",
        })
      ).toThrow();
    });
  });

  describe("disputeEscrowSchema", () => {
    it("accepts valid reason", () => {
      const parsed = validate(disputeEscrowSchema, {
        reason: "The delivered deliverables do not match the agreed specification.",
      });
      expect(parsed.reason).toContain("delivered deliverables");
    });

    it("rejects overly short reasons", () => {
      expect(() => validate(disputeEscrowSchema, { reason: "Too short" })).toThrow();
    });
  });
});
