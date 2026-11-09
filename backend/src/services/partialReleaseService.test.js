"use strict";

const PartialReleaseService = require("./partialReleaseService");

describe("PartialReleaseService", () => {
  it("calculates exact partial release breakdown and fee", () => {
    const res = PartialReleaseService.calculatePartialRelease({
      milestoneAmount: "100.0000000",
      alreadyReleased: "0.0000000",
      requestAmount: "40.0000000",
      feeBps: 100, // 1%
    });

    expect(res.success).toBe(true);
    expect(res.requestAmount).toBe("40.0000000");
    expect(res.platformFee).toBe("0.4000000"); // 1% of 40
    expect(res.freelancerPayout).toBe("39.6000000");
    expect(res.remainingMilestoneAmount).toBe("60.0000000");
    expect(res.isFullyCompleted).toBe(false);
  });

  it("identifies full completion when entire remaining amount released", () => {
    const res = PartialReleaseService.calculatePartialRelease({
      milestoneAmount: "100.0000000",
      alreadyReleased: "60.0000000",
      requestAmount: "40.0000000",
      feeBps: 200, // 2%
    });

    expect(res.success).toBe(true);
    expect(res.remainingMilestoneAmount).toBe("0.0000000");
    expect(res.isFullyCompleted).toBe(true);
    expect(res.platformFee).toBe("0.8000000");
    expect(res.freelancerPayout).toBe("39.2000000");
  });

  it("rejects request exceeding available balance", () => {
    const res = PartialReleaseService.calculatePartialRelease({
      milestoneAmount: "50.0000000",
      alreadyReleased: "30.0000000",
      requestAmount: "25.0000000", // 25 > 20
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("exceeds available milestone balance");
  });

  it("rejects zero or negative requestAmount", () => {
    const res = PartialReleaseService.calculatePartialRelease({
      milestoneAmount: "50.0000000",
      requestAmount: "0",
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("greater than zero");
  });

  it("rejects excess decimal precision", () => {
    const res = PartialReleaseService.calculatePartialRelease({
      milestoneAmount: "50.00000001", // 8 decimals
      requestAmount: "10",
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("exceeds 7 decimal places");
  });
});
