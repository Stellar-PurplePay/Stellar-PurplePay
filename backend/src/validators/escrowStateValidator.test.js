"use strict";

const {
  validateStateTransition,
  validateMilestoneReleaseAmount,
} = require("./escrowStateValidator");

describe("escrowStateValidator", () => {
  const dummyTx = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  describe("validateStateTransition", () => {
    it("allows valid transitions with transaction hash", () => {
      const res = validateStateTransition("IN_PROGRESS", "COMPLETED", {
        transactionHash: dummyTx,
      });
      expect(res.valid).toBe(true);
    });

    it("rejects transition to COMPLETED without transaction hash", () => {
      const res = validateStateTransition("IN_PROGRESS", "COMPLETED");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("transactionHash proof");
    });

    it("rejects transitions from terminal states", () => {
      const res = validateStateTransition("COMPLETED", "IN_PROGRESS");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Illegal state transition");
    });

    it("rejects unknown current status", () => {
      const res = validateStateTransition("UNKNOWN_STATUS", "COMPLETED");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Invalid current status");
    });
  });

  describe("validateMilestoneReleaseAmount", () => {
    it("validates release within remaining balance", () => {
      const res = validateMilestoneReleaseAmount(1000n, 400n, 300n);
      expect(res.valid).toBe(true);
      expect(res.remaining).toBe(300n);
    });

    it("rejects release exceeding remaining balance", () => {
      const res = validateMilestoneReleaseAmount(1000n, 800n, 300n);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("exceeds remaining milestone balance");
    });

    it("rejects zero or negative release amount", () => {
      const resZero = validateMilestoneReleaseAmount(1000n, 0n, 0n);
      expect(resZero.valid).toBe(false);

      const resNeg = validateMilestoneReleaseAmount(1000n, 0n, -10n);
      expect(resNeg.valid).toBe(false);
    });

    it("handles invalid non-numeric inputs cleanly", () => {
      const res = validateMilestoneReleaseAmount("abc", 0n, 100n);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Invalid numeric amount");
    });
  });
});
