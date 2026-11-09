/**
 * frontend/utils/stellarFeeCalculator.ts
 *
 * Stellar network transaction fee tier calculation and Stroop conversions.
 */

export interface FeeTier {
  id: "standard" | "fast" | "urgent";
  label: string;
  description: string;
  feeStroops: number;
  feeXlm: string;
  estimatedSeconds: number;
}

export const BASE_RESERVE_STROOPS = 5_000_000; // 0.5 XLM
export const BASE_FEE_STROOPS = 100; // 0.00001 XLM
export const STROOPS_IN_ONE_XLM = 10_000_000;

/**
 * Converts a Stroop integer amount into human-readable formatted XLM string.
 */
export function stroopsToXlm(stroops: number | bigint): string {
  const num = typeof stroops === "bigint" ? Number(stroops) : stroops;
  if (!Number.isFinite(num) || num < 0) {
    throw new Error("Stroop amount must be a non-negative finite number");
  }
  return (num / STROOPS_IN_ONE_XLM).toFixed(7);
}

/**
 * Converts an XLM string or number to integer Stroops.
 */
export function xlmToStroops(xlm: string | number): number {
  const str = String(xlm).trim();
  const parsed = parseFloat(str);
  if (isNaN(parsed) || parsed < 0) {
    throw new Error("XLM amount must be a non-negative numeric string");
  }
  return Math.round(parsed * STROOPS_IN_ONE_XLM);
}

/**
 * Calculates standard, fast, and urgent fee tiers based on base fee and operation count.
 *
 * @param baseFeeStroops - Base fee per operation (defaults to network standard 100 stroops)
 * @param operationCount - Number of operations inside the transaction envelope (defaults to 1)
 * @returns Array of FeeTier items
 */
export function calculateFeeTiers(
  baseFeeStroops: number = BASE_FEE_STROOPS,
  operationCount: number = 1
): FeeTier[] {
  const safeBase = Math.max(100, Math.floor(baseFeeStroops));
  const safeOps = Math.max(1, Math.floor(operationCount));

  const standardFee = safeBase * safeOps;
  const fastFee = Math.max(standardFee + 50 * safeOps, Math.round(standardFee * 1.5));
  const urgentFee = Math.max(standardFee + 200 * safeOps, standardFee * 3);

  return [
    {
      id: "standard",
      label: "Standard",
      description: "Default network priority",
      feeStroops: standardFee,
      feeXlm: stroopsToXlm(standardFee),
      estimatedSeconds: 5,
    },
    {
      id: "fast",
      label: "Fast",
      description: "Priority inclusion during surge spikes",
      feeStroops: fastFee,
      feeXlm: stroopsToXlm(fastFee),
      estimatedSeconds: 3,
    },
    {
      id: "urgent",
      label: "Urgent",
      description: "Top-of-block priority for high-value operations",
      feeStroops: urgentFee,
      feeXlm: stroopsToXlm(urgentFee),
      estimatedSeconds: 1,
    },
  ];
}
