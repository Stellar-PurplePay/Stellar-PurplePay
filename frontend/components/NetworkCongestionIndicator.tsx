import React from "react";

export interface NetworkCongestionIndicatorProps {
  feeMultiplier?: number;
  latencyMs?: number;
  ledgerSequence?: number;
  onRefresh?: () => void;
  compact?: boolean;
}

export type CongestionLevel = "low" | "moderate" | "high";

export const NetworkCongestionIndicator: React.FC<NetworkCongestionIndicatorProps> = ({
  feeMultiplier = 1.0,
  latencyMs = 850,
  ledgerSequence,
  onRefresh,
  compact = false,
}) => {
  let level: CongestionLevel = "low";
  if (feeMultiplier >= 2.5 || latencyMs >= 3500) {
    level = "high";
  } else if (feeMultiplier >= 1.2 || latencyMs >= 1500) {
    level = "moderate";
  }

  const levelConfig = {
    low: {
      label: "Optimal",
      description: "Low network load. Standard fees (100 stroops) apply.",
      badge: "bg-emerald-500",
      text: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-800",
    },
    moderate: {
      label: "Moderate Load",
      description: `Elevated traffic. Suggested fee: ${(feeMultiplier * 100).toFixed(0)} stroops.`,
      badge: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-400",
      badgeText: "text-amber-800 dark:text-amber-300",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
    },
    high: {
      label: "Surge Congestion",
      description: `High congestion. Suggested fee: ${(feeMultiplier * 100).toFixed(0)} stroops for priority inclusion.`,
      badge: "bg-rose-500",
      text: "text-rose-700 dark:text-rose-400",
      badgeText: "text-rose-800 dark:text-rose-300",
      bg: "bg-rose-50 dark:bg-rose-950/30",
      border: "border-rose-200 dark:border-rose-800",
    },
  }[level];

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${levelConfig.bg} ${levelConfig.border} ${levelConfig.text}`}
        role="status"
        aria-label={`Stellar network congestion: ${levelConfig.label}`}
      >
        <span className={`h-2 w-2 rounded-full ${levelConfig.badge}`} />
        <span>{levelConfig.label}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label={`Stellar network status: ${levelConfig.label}`}
      className={`rounded-xl border p-4 shadow-sm ${levelConfig.bg} ${levelConfig.border}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`relative flex h-3 w-3`}>
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${levelConfig.badge}`}
            />
            <span className={`relative inline-flex rounded-full h-3 w-3 ${levelConfig.badge}`} />
          </span>
          <h4 className={`text-sm font-bold ${levelConfig.text}`}>
            Stellar Network: {levelConfig.label}
          </h4>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="rounded p-1 text-xs text-gray-500 hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/5"
            aria-label="Refresh network metrics"
          >
            ↻
          </button>
        )}
      </div>

      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
        {levelConfig.description}
      </p>

      <div className="mt-3 flex flex-wrap gap-4 text-xs font-mono text-gray-500 dark:text-gray-400">
        <div>
          <span>RPC Latency: </span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">{latencyMs} ms</span>
        </div>
        <div>
          <span>Fee Multiplier: </span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">{feeMultiplier.toFixed(2)}x</span>
        </div>
        {ledgerSequence && (
          <div>
            <span>Ledger: </span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">#{ledgerSequence}</span>
          </div>
        )}
      </div>
    </div>
  );
};

