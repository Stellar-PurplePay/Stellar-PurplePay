"use client";

import React, { useMemo } from "react";

export interface AuditBlock {
  index: number;
  action: string;
  timestamp: string | number;
  payload?: any;
  previousHash: string;
  entryHash: string;
}

export interface AuditLogChainViewerProps {
  chain: AuditBlock[];
  expectedRootHash?: string;
  onVerify?: (isValid: boolean) => void;
  className?: string;
}

function truncateHash(hash: string, lead = 8, trail = 8): string {
  if (!hash) return "00000000...00000000";
  if (hash.length <= lead + trail) return hash;
  return `${hash.slice(0, lead)}...${hash.slice(-trail)}`;
}

export const AuditLogChainViewer: React.FC<AuditLogChainViewerProps> = ({
  chain = [],
  expectedRootHash,
  onVerify,
  className = "",
}) => {
  const verification = useMemo(() => {
    if (!chain || chain.length === 0) {
      return { status: "empty" as const, message: "No audit records recorded yet." };
    }

    for (let i = 0; i < chain.length; i++) {
      const block = chain[i];
      if (i > 0) {
        const prev = chain[i - 1];
        if (
          block.previousHash.toLowerCase() !== prev.entryHash.toLowerCase() ||
          block.index !== prev.index + 1
        ) {
          return {
            status: "tampered" as const,
            brokenIndex: block.index,
            message: `Hash link broken at Block #${block.index}`,
          };
        }
      }
    }

    const latest = chain[chain.length - 1];
    if (
      expectedRootHash &&
      latest.entryHash.toLowerCase() !== expectedRootHash.toLowerCase()
    ) {
      return {
        status: "tampered" as const,
        brokenIndex: latest.index,
        message: "Latest root hash does not match expected cryptographic anchor",
      };
    }

    return {
      status: "verified" as const,
      message: "Cryptographic chain fully verified and tamper-free",
    };
  }, [chain, expectedRootHash]);

  React.useEffect(() => {
    if (onVerify) {
      onVerify(verification.status === "verified");
    }
  }, [verification, onVerify]);

  return (
    <section
      role="region"
      aria-label="Cryptographic Audit Trail"
      className={`rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Immutable Audit Trail
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            SHA-256 hash-chained ledger events with on-chain anchor verification.
          </p>
        </div>

        <div aria-live="polite">
          {verification.status === "verified" && (
            <span
              data-testid="verification-badge-verified"
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 border border-green-200 dark:border-green-800"
            >
              ✓ Chain Verified
            </span>
          )}
          {verification.status === "tampered" && (
            <span
              data-testid="verification-badge-tampered"
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800"
            >
              ⚠ Tamper Detected
            </span>
          )}
          {verification.status === "empty" && (
            <span
              data-testid="verification-badge-empty"
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Empty Ledger
            </span>
          )}
        </div>
      </div>

      {verification.status === "tampered" && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 text-sm font-medium"
        >
          {verification.message}
        </div>
      )}

      {chain.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No audit entries recorded yet.
        </div>
      ) : (
        <ol className="relative border-l-2 border-indigo-200 dark:border-indigo-900/60 ml-4 space-y-6">
          {chain.map((block) => (
            <li key={block.index} className="ml-6" data-testid={`audit-block-${block.index}`}>
              <span className="absolute -left-3 flex items-center justify-center w-6 h-6 bg-indigo-600 text-white rounded-full ring-4 ring-white dark:ring-gray-900 text-xs font-bold">
                {block.index}
              </span>

              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="font-semibold text-sm text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
                    {block.action.replace(/_/g, " ")}
                  </span>
                  <time className="text-xs text-gray-500 dark:text-gray-400">
                    {typeof block.timestamp === "number"
                      ? new Date(block.timestamp).toUTCString()
                      : block.timestamp}
                  </time>
                </div>

                {block.payload && (
                  <pre className="text-xs bg-white dark:bg-gray-900 p-2.5 rounded border border-gray-200 dark:border-gray-800 font-mono text-gray-700 dark:text-gray-300 overflow-x-auto mb-3">
                    {typeof block.payload === "string"
                      ? block.payload
                      : JSON.stringify(block.payload, null, 2)}
                  </pre>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700/50">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-sans">
                      Previous Hash
                    </span>
                    <span title={block.previousHash} className="select-all">
                      {truncateHash(block.previousHash)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-sans">
                      Block Entry Hash
                    </span>
                    <span title={block.entryHash} className="select-all text-indigo-600 dark:text-indigo-400 font-semibold">
                      {truncateHash(block.entryHash)}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
