"use client";

import React, { useState } from "react";

export interface NetworkCongestionBannerProps {
  currentBaseFeeStroops: number;
  surgeThresholdStroops?: number;
  recommendedFeeStroops?: number;
  onDismiss?: () => void;
  className?: string;
}

export const NetworkCongestionBanner: React.FC<NetworkCongestionBannerProps> = ({
  currentBaseFeeStroops,
  surgeThresholdStroops = 1000,
  recommendedFeeStroops,
  onDismiss,
  className = "",
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || currentBaseFeeStroops <= surgeThresholdStroops) {
    return null;
  }

  const surgeMultiplier = Math.round((currentBaseFeeStroops / 100) * 10) / 10;
  const suggested = recommendedFeeStroops || Math.ceil(currentBaseFeeStroops * 1.25);

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded-xl p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-xl" aria-hidden="true">
            ⚠️
          </span>
          <div>
            <h4 className="text-sm font-bold">
              Stellar Network Congestion Warning
            </h4>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
              Current base ledger fee has surged to{" "}
              <span data-testid="surge-fee-text" className="font-mono font-bold">
                {currentBaseFeeStroops.toLocaleString()} stroops
              </span>{" "}
              ({surgeMultiplier}x baseline).
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 font-medium">
              Recommended inclusion bid:{" "}
              <span data-testid="recommended-fee-text" className="font-mono font-bold text-amber-900 dark:text-amber-200">
                {suggested.toLocaleString()} stroops
              </span>{" "}
              to avoid transaction timeout.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          data-testid="dismiss-banner-button"
          aria-label="Dismiss congestion warning"
          className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-100 text-lg leading-none p-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
