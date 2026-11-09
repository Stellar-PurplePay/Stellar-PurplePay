"use strict";

const STROOPS_PER_XLM = 10_000_000n;

/**
 * Service to validate and calculate partial milestone release economics and fees
 * with exact BigInt Stroop arithmetic.
 */
class PartialReleaseService {
  /**
   * Converts a decimal amount string or number to BigInt Stroops.
   * @param {string | number} val
   * @returns {bigint}
   */
  static toStroops(val) {
    const s = String(val).trim();
    if (!s || isNaN(Number(s))) {
      throw new Error(`Invalid numeric amount: "${val}"`);
    }
    const [whole, frac = ""] = s.split(".");
    if (frac.length > 7) {
      throw new Error(`Amount "${s}" exceeds 7 decimal places of precision`);
    }
    const paddedFrac = frac.padEnd(7, "0");
    return BigInt(whole) * STROOPS_PER_XLM + BigInt(paddedFrac);
  }

  /**
   * Converts BigInt Stroops to 7-decimal string.
   * @param {bigint} stroops
   * @returns {string}
   */
  static fromStroops(stroops) {
    const sign = stroops < 0n ? "-" : "";
    const abs = stroops < 0n ? -stroops : stroops;
    const whole = abs / STROOPS_PER_XLM;
    const frac = abs % STROOPS_PER_XLM;
    const fracStr = frac.toString().padStart(7, "0");
    return `${sign}${whole}.${fracStr}`;
  }

  /**
   * Calculates financial breakdown for a partial milestone release.
   *
   * @param {Object} params
   * @param {string | number} params.milestoneAmount - Total amount allocated to the milestone
   * @param {string | number} [params.alreadyReleased] - Cumulative amount already released for this milestone
   * @param {string | number} params.requestAmount - Proposed partial release amount
   * @param {number} [params.feeBps] - Platform fee in basis points (100 bps = 1%)
   * @returns {{
   *   success: boolean,
   *   requestAmount: string,
   *   freelancerPayout: string,
   *   platformFee: string,
   *   remainingMilestoneAmount: string,
   *   isFullyCompleted: boolean,
   *   error?: string
   * }}
   */
  static calculatePartialRelease({
    milestoneAmount,
    alreadyReleased = "0",
    requestAmount,
    feeBps = 0,
  }) {
    try {
      const milestoneStroops = this.toStroops(milestoneAmount);
      const releasedStroops = this.toStroops(alreadyReleased);
      const requestStroops = this.toStroops(requestAmount);

      if (milestoneStroops <= 0n) {
        return { success: false, error: "Milestone amount must be positive" };
      }
      if (requestStroops <= 0n) {
        return { success: false, error: "Release amount must be greater than zero" };
      }

      const availableStroops = milestoneStroops - releasedStroops;
      if (availableStroops <= 0n) {
        return { success: false, error: "Milestone has already been fully released" };
      }
      if (requestStroops > availableStroops) {
        return {
          success: false,
          error: `Requested amount (${this.fromStroops(requestStroops)}) exceeds available milestone balance (${this.fromStroops(availableStroops)})`,
        };
      }

      const cleanFeeBps = Math.max(0, Math.min(1000, Number(feeBps) || 0)); // 0 - 10%
      const feeStroops = (requestStroops * BigInt(cleanFeeBps)) / 10_000n;
      const payoutStroops = requestStroops - feeStroops;
      const newRemainingStroops = availableStroops - requestStroops;

      return {
        success: true,
        requestAmount: this.fromStroops(requestStroops),
        freelancerPayout: this.fromStroops(payoutStroops),
        platformFee: this.fromStroops(feeStroops),
        remainingMilestoneAmount: this.fromStroops(newRemainingStroops),
        isFullyCompleted: newRemainingStroops === 0n,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = PartialReleaseService;
