import React, { useState } from "react";
import { validateNetworkMatch, getNetworkDisplayName } from "../utils/networkValidator";

export interface NetworkMismatchBannerProps {
  appNetwork?: "testnet" | "mainnet";
  walletPassphrase?: string;
  onDismiss?: () => void;
}

export default function NetworkMismatchBanner({
  appNetwork = (process.env.NEXT_PUBLIC_STELLAR_NETWORK as "testnet" | "mainnet") || "testnet",
  walletPassphrase,
  onDismiss,
}: NetworkMismatchBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!walletPassphrase || dismissed) {
    return null;
  }

  const check = validateNetworkMatch(appNetwork, walletPassphrase);
  if (check.matches) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-50 border-b border-amber-500/40 bg-amber-950/90 text-amber-200 backdrop-blur-md px-4 py-3 shadow-lg"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <svg
            className="h-5 w-5 text-amber-400 flex-shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-sm font-medium">
            <span>
              Network Mismatch: PurplePay is on{" "}
              <strong className="text-white underline">{getNetworkDisplayName(appNetwork)}</strong>, but your wallet is connected to{" "}
              <strong className="text-amber-300">{getNetworkDisplayName(walletPassphrase)}</strong>.
            </span>
            <span className="block text-xs text-amber-300/80 mt-0.5">
              Please switch your network in the Freighter extension to avoid transaction simulation errors.
            </span>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          type="button"
          aria-label="Dismiss network mismatch alert"
          className="text-xs px-2.5 py-1 rounded bg-amber-800/60 hover:bg-amber-700/80 text-amber-100 transition-colors flex-shrink-0"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
