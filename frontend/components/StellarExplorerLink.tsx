import React, { useState } from "react";
import {
  buildStellarExplorerUrl,
  StellarEntityType,
  StellarNetworkTarget,
} from "../utils/stellarExplorerUrl";

export interface StellarExplorerLinkProps {
  type: StellarEntityType;
  value: string;
  network?: StellarNetworkTarget;
  label?: string;
  showCopy?: boolean;
  className?: string;
}

export const StellarExplorerLink: React.FC<StellarExplorerLinkProps> = ({
  type,
  value,
  network = "testnet",
  label,
  showCopy = true,
  className = "",
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!value) return null;

  const url = buildStellarExplorerUrl(type, value, { network });
  const truncate = (str: string) => {
    if (!str || str.length < 14) return str;
    return `${str.slice(0, 6)}...${str.slice(-6)}`;
  };

  const displayText = label || truncate(value);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback or ignore
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-mono dark:border-zinc-800 dark:bg-zinc-850 ${className}`}
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={`View ${type} on Stellar Expert (${network})`}
        className="text-indigo-600 hover:underline dark:text-indigo-400"
      >
        {displayText}
      </a>

      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${type} to clipboard`}
          className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700"
        >
          {copied ? (
            <span className="text-[10px] font-sans font-semibold text-emerald-600 dark:text-emerald-400">
              Copied!
            </span>
          ) : (
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          )}
        </button>
      )}
    </span>
  );
};
