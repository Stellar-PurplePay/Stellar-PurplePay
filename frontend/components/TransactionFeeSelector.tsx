/**
 * frontend/components/TransactionFeeSelector.tsx
 *
 * Accessible fee tier selector component for Stellar transactions.
 */

import React, { useMemo } from "react";
import {
  calculateFeeTiers,
  FeeTier,
  BASE_FEE_STROOPS,
} from "../utils/stellarFeeCalculator";

export interface TransactionFeeSelectorProps {
  selectedTierId: "standard" | "fast" | "urgent";
  onSelectTier: (tier: FeeTier) => void;
  operationCount?: number;
  baseFeeStroops?: number;
  disabled?: boolean;
}

export const TransactionFeeSelector: React.FC<TransactionFeeSelectorProps> = ({
  selectedTierId,
  onSelectTier,
  operationCount = 1,
  baseFeeStroops = BASE_FEE_STROOPS,
  disabled = false,
}) => {
  const tiers = useMemo(
    () => calculateFeeTiers(baseFeeStroops, operationCount),
    [baseFeeStroops, operationCount]
  );

  return (
    <div className="w-full flex flex-col gap-2 font-sans">
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
        Transaction Speed & Priority
      </label>

      <div
        role="radiogroup"
        aria-label="Transaction fee priority options"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {tiers.map((tier) => {
          const isSelected = tier.id === selectedTierId;

          return (
            <button
              key={tier.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onSelectTier(tier)}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50/70 shadow-sm dark:bg-indigo-950/40 dark:border-indigo-500"
                  : "border-gray-200 hover:border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700"
              } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-sm text-gray-900 dark:text-white">
                  {tier.label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ~{tier.estimatedSeconds}s
                </span>
              </div>

              <div className="mt-2">
                <div className="text-xs font-mono font-medium text-indigo-700 dark:text-indigo-400">
                  {tier.feeXlm} XLM
                </div>
                <div className="text-[11px] text-gray-400 dark:text-gray-500">
                  {tier.feeStroops.toLocaleString()} stroops
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
