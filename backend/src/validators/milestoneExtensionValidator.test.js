"use strict";

const { validateMilestoneExtension } = require("./milestoneExtensionValidator");

describe("milestoneExtensionValidator", () => {
  const validClient = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

  it("validates correct payload successfully", () => {
    const res = validateMilestoneExtension({
      jobId: "job-101",
      milestoneId: 1,
      extensionSeconds: 86400,
      clientAddress: validClient,
      reason: "Revision requested",
    });

    expect(res.success).toBe(true);
    expect(res.data.milestoneId).toBe(1);
    expect(res.data.extensionSeconds).toBe(86400);
  });

  it("converts string milestoneId and extensionSeconds to numbers", () => {
    const res = validateMilestoneExtension({
      jobId: "job-101",
      milestoneId: "2",
      extensionSeconds: "172800",
      clientAddress: validClient,
    });

    expect(res.success).toBe(true);
    expect(res.data.milestoneId).toBe(2);
    expect(res.data.extensionSeconds).toBe(172800);
  });

  it("rejects extensionSeconds under 60 seconds", () => {
    const res = validateMilestoneExtension({
      jobId: "job-101",
      milestoneId: 1,
      extensionSeconds: 30,
      clientAddress: validClient,
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("between 60 seconds and 31,536,000");
  });

  it("rejects invalid client Stellar address", () => {
    const res = validateMilestoneExtension({
      jobId: "job-101",
      milestoneId: 1,
      extensionSeconds: 3600,
      clientAddress: "not_a_valid_stellar_key",
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("valid Stellar public key");
  });

  it("rejects empty jobId", () => {
    const res = validateMilestoneExtension({
      jobId: "   ",
      milestoneId: 1,
      extensionSeconds: 3600,
      clientAddress: validClient,
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("jobId is required");
  });
});
