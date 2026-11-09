/**
 * frontend/components/StellarNetworkStatusIndicator.tsx
 *
 * Real-time navigation pill displaying Stellar network connectivity, latency, and ledger status.
 */

import React from "react";

export interface StellarNetworkStatusIndicatorProps {
  network: "testnet" | "mainnet";
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs?: number;
  latestLedger?: number;
}

export const StellarNetworkStatusIndicator: React.FC<StellarNetworkStatusIndicatorProps> = ({
  network,
  status,
  latencyMs,
  latestLedger,
}) => {
  const statusColors = {
    healthy: "bg-emerald-500",
    degraded: "bg-amber-500",
    unhealthy: "bg-red-500",
  };

  const statusText = {
    healthy: "Operational",
    degraded: "Degraded",
    unhealthy: "Node Offline",
  };

  const statusBg = {
    healthy: "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300",
    degraded: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300",
    unhealthy: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300",
  };

  const label = `Stellar ${network.toUpperCase()}: ${statusText[status]}${
    latencyMs !== undefined ? ` (${latencyMs}ms)` : ""
  }`;

  return (
    <div
      role="status"
      aria-label={label}
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium font-sans shadow-xs transition-colors ${statusBg[status]}`}
    >
      <span className="relative flex h-2 w-2">
        {status === "healthy" && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${statusColors[status]}`} />
      </span>

      <span className="font-semibold uppercase tracking-wider text-[10px]">
        {network.toUpperCase()}
      </span>

      {latestLedger !== undefined && (
        <span className="text-[10px] font-mono opacity-70">
          {`#${latestLedger}`}
        </span>
      )}

      {latencyMs !== undefined && (
        <span className="text-[10px] font-mono opacity-80">
          {`${latencyMs}ms`}
        </span>
      )}
    </div>
  );
};
