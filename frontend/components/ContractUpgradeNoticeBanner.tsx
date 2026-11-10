"use client";

import React from "react";

export interface ContractUpgradeNoticeBannerProps {
  newWasmHash: string;
  unlockTimestamp: number;
  currentTimestamp?: number;
  onExecute?: () => void;
  canExecute?: boolean;
  className?: string;
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "Timelock expired (ready to execute)";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function truncateHash(hash: string): string {
  if (!hash) return "";
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

export const ContractUpgradeNoticeBanner: React.FC<ContractUpgradeNoticeBannerProps> = ({
  newWasmHash,
  unlockTimestamp,
  currentTimestamp,
  onExecute,
  canExecute = false,
  className = "",
}) => {
  const now = currentTimestamp ?? Math.floor(Date.now() / 1000);
  const remaining = Math.max(0, unlockTimestamp - now);
  const isMature = remaining === 0;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded-lg p-4 border transition-colors ${
        isMature
          ? "bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 text-amber-900 dark:text-amber-200"
          : "bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 text-blue-900 dark:text-blue-200"
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-xl" aria-hidden="true">
            {isMature ? "⚡" : "🛡️"}
          </span>
          <div>
            <h4 className="font-semibold text-sm">
              {isMature
                ? "Contract Upgrade Staged & Ready to Execute"
                : "Protocol Upgrade Timelock Active"}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
              Target Code Hash:{" "}
              <code
                data-testid="wasm-code-hash"
                title={newWasmHash}
                className="font-mono font-medium px-1.5 py-0.5 rounded bg-white/60 dark:bg-black/40"
              >
                {truncateHash(newWasmHash)}
              </code>
            </p>
            <p className="text-xs font-medium mt-1">
              {isMature ? (
                <span className="text-green-700 dark:text-green-400 font-semibold">
                  Timelock delay satisfied.
                </span>
              ) : (
                <>
                  Execution unlocked in:{" "}
                  <span data-testid="countdown-timer" className="font-mono font-bold">
                    {formatCountdown(remaining)}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {isMature && canExecute && onExecute && (
          <button
            type="button"
            onClick={onExecute}
            data-testid="execute-upgrade-button"
            className="self-start sm:self-center px-4 py-2 text-xs font-semibold rounded-md bg-amber-600 hover:bg-amber-700 text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
          >
            Execute Upgrade
          </button>
        )}
      </div>
    </div>
  );
};

