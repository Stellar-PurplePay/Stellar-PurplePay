"use client";

import React from "react";

export interface TestnetBadgeProps {
  network?: "testnet" | "public" | "futurenet";
  contractId?: string;
  className?: string;
}

export const TestnetBadge: React.FC<TestnetBadgeProps> = ({
  network = "testnet",
  contractId,
  className = "",
}) => {
  const isTestnet = network === "testnet" || network === "futurenet";
  const explorerBase = isTestnet
    ? `https://stellar.expert/explorer/${network}`
    : "https://stellar.expert/explorer/public";

  const explorerUrl = contractId
    ? `${explorerBase}/contract/${contractId}`
    : explorerBase;

  return (
    <aside
      role="status"
      aria-label={`Active Stellar Network: ${network.toUpperCase()}`}
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border ${
        isTestnet
          ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
          : "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
      } ${className}`}
      data-testid="testnet-badge-root"
    >
      <span
        aria-hidden="true"
        className={`w-2 h-2 rounded-full animate-pulse ${
          isTestnet ? "bg-amber-500" : "bg-emerald-500"
        }`}
      />
      <span className="font-semibold uppercase tracking-wider">{network}</span>
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${network} in Stellar Expert`}
        className="underline hover:opacity-80 transition-opacity ml-0.5 text-[10px]"
        data-testid="explorer-link"
      >
        Explorer
      </a>
    </aside>
  );
};

export default TestnetBadge;
