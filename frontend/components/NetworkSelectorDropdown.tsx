"use client";

import React, { useState } from "react";

export type StellarNetworkId = "testnet" | "public" | "futurenet";

export interface NetworkSelectorDropdownProps {
  activeNetwork?: StellarNetworkId;
  onNetworkChange?: (network: StellarNetworkId) => void;
  className?: string;
}

export const NetworkSelectorDropdown: React.FC<NetworkSelectorDropdownProps> = ({
  activeNetwork = "testnet",
  onNetworkChange,
  className = "",
}) => {
  const [selected, setSelected] = useState<StellarNetworkId>(activeNetwork);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextNetwork = e.target.value as StellarNetworkId;
    setSelected(nextNetwork);
    onNetworkChange?.(nextNetwork);
  };

  return (
    <div
      className={`inline-flex items-center gap-2 p-1 border rounded-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-xs ${className}`}
      data-testid="network-selector-container"
    >
      <span
        aria-hidden="true"
        className={`w-2.5 h-2.5 rounded-full ${
          selected === "public" ? "bg-emerald-500" : "bg-amber-500"
        }`}
        data-testid="network-status-indicator"
      />
      <label htmlFor="stellar-network-select" className="sr-only">
        Select Stellar Network
      </label>
      <select
        id="stellar-network-select"
        value={selected}
        onChange={handleChange}
        data-testid="network-select"
        className="bg-transparent font-medium text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer pr-1"
      >
        <option value="testnet">Stellar Testnet</option>
        <option value="futurenet">Soroban Futurenet</option>
        <option value="public">Stellar Mainnet</option>
      </select>
      {selected === "public" && (
        <span
          data-testid="mainnet-warning"
          className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold px-1 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40"
        >
          Live Funds
        </span>
      )}
    </div>
  );
};

export default NetworkSelectorDropdown;
