import { useState, useMemo } from "react";

export interface UsePartialReleaseOptions {
  totalAmount: string;
  alreadyReleased?: string;
  feeBps?: number;
  asset?: string;
}

export interface UsePartialReleaseResult {
  inputAmount: string;
  setInputAmount: (val: string) => void;
  setPercentage: (pct: number) => void;
  reset: () => void;
  remainingAmount: number;
  payoutAmount: number;
  platformFee: number;
  projectedRemaining: number;
  isFullyCompleted: boolean;
  isValid: boolean;
  error: string | null;
}

/**
 * Custom React hook for calculating and validating partial milestone releases.
 */
export function usePartialRelease({
  totalAmount,
  alreadyReleased = "0",
  feeBps = 0,
}: UsePartialReleaseOptions): UsePartialReleaseResult {
  const [inputAmount, setInputAmountState] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const totalNum = parseFloat(totalAmount) || 0;
  const releasedNum = parseFloat(alreadyReleased) || 0;
  const remainingAmount = Math.max(0, totalNum - releasedNum);

  const inputNum = parseFloat(inputAmount) || 0;

  const setInputAmount = (val: string) => {
    setInputAmountState(val);
    const num = parseFloat(val);
    if (!val.trim()) {
      setError(null);
      return;
    }
    if (isNaN(num) || num <= 0) {
      setError("Release amount must be greater than zero.");
      return;
    }
    if (num > remainingAmount) {
      setError(`Amount cannot exceed remaining balance of ${remainingAmount.toFixed(7)}`);
      return;
    }
    setError(null);
  };

  const setPercentage = (pct: number) => {
    if (remainingAmount <= 0) return;
    const clampedPct = Math.max(0, Math.min(100, pct));
    const calculated = (remainingAmount * (clampedPct / 100)).toFixed(7);
    const trimmed = parseFloat(calculated).toString();
    setInputAmount(trimmed);
  };

  const reset = () => {
    setInputAmountState("");
    setError(null);
  };

  const { platformFee, payoutAmount, projectedRemaining, isFullyCompleted, isValid } =
    useMemo(() => {
      const valid = Boolean(inputAmount.trim()) && !error && inputNum > 0 && inputNum <= remainingAmount;
      if (!valid) {
        return {
          platformFee: 0,
          payoutAmount: 0,
          projectedRemaining: remainingAmount,
          isFullyCompleted: false,
          isValid: false,
        };
      }

      const cleanFeeBps = Math.max(0, Math.min(1000, feeBps));
      const fee = (inputNum * cleanFeeBps) / 10000;
      const payout = inputNum - fee;
      const projected = Math.max(0, remainingAmount - inputNum);

      return {
        platformFee: parseFloat(fee.toFixed(7)),
        payoutAmount: parseFloat(payout.toFixed(7)),
        projectedRemaining: parseFloat(projected.toFixed(7)),
        isFullyCompleted: projected === 0,
        isValid: true,
      };
    }, [inputAmount, inputNum, remainingAmount, feeBps, error]);

  return {
    inputAmount,
    setInputAmount,
    setPercentage,
    reset,
    remainingAmount,
    payoutAmount,
    platformFee,
    projectedRemaining,
    isFullyCompleted,
    isValid,
    error,
  };
}
