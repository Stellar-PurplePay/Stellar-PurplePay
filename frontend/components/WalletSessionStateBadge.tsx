"use client";

import React, { useState } from "react";

export interface WalletSessionStateBadgeProps {
  publicKey: string;
  network?: string;
  sessionExpiresAt?: number | string;
  onDisconnect?: () => void;
  className?: string;
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr || "";
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}

export const WalletSessionStateBadge: React.FC<WalletSessionStateBadgeProps> = ({
  publicKey,
  network = "Testnet",
  sessionExpiresAt,
  onDisconnect,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!publicKey) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(publicKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Ignore clipboard write failures in restricted environments
    }
  };

  return (
    <div
      role="status"
      aria-label="Active Wallet Session"
      className={`inline-flex items-center gap-3 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-xs shadow-sm ${className}`}
    >
      <div className="flex items-center gap-1.5 pl-1">
        <span
          className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
          aria-hidden="true"
        />
        <span className="font-semibold text-gray-700 dark:text-gray-200">
          Connected
        </span>
      </div>

      <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />

      <button
        type="button"
        onClick={handleCopy}
        title="Click to copy full public key"
        data-testid="copy-address-button"
        className="font-mono text-gray-900 dark:text-white font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        {truncateAddress(publicKey)}
      </button>

      {copied && (
        <span
          data-testid="copied-tooltip"
          className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium"
        >
          Copied!
        </span>
      )}

      <span
        data-testid="network-badge"
        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
      >
        {network}
      </span>

      {onDisconnect && (
        <button
          type="button"
          onClick={onDisconnect}
          data-testid="disconnect-button"
          aria-label="Disconnect wallet session"
          className="ml-1 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors font-medium"
        >
          Disconnect
        </button>
      )}
    </div>
  );
};
