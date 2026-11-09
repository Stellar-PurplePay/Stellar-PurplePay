/**
 * frontend/components/ClaimableBalanceBanner.tsx
 *
 * Accessible banner alerting users to pending claimable balances on the Stellar ledger.
 */

import React, { useState } from "react";

export interface ClaimableBalanceItem {
  id: string;
  amount: string;
  asset: string;
  sponsor: string;
  canClaim: boolean;
}

export interface ClaimableBalanceBannerProps {
  claimableBalances: ClaimableBalanceItem[];
  onClaim: (balanceId: string) => Promise<void>;
  isLoading?: boolean;
}

export const ClaimableBalanceBanner: React.FC<ClaimableBalanceBannerProps> = ({
  claimableBalances,
  onClaim,
  isLoading = false,
}) => {
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const activeBalances = claimableBalances.filter((b) => !claimedIds.has(b.id));

  if (activeBalances.length === 0) return null;

  const handleClaimClick = async (balanceId: string) => {
    setClaimingId(balanceId);
    setError(null);
    try {
      await onClaim(balanceId);
      setClaimedIds((prev) => new Set(prev).add(balanceId));
    } catch (err: any) {
      setError(err?.message || "Failed to claim balance on-chain");
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <aside
      role="region"
      aria-live="polite"
      aria-label="Pending claimable balances"
      className="w-full bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 font-sans mb-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-amber-600 dark:text-amber-400 text-base" aria-hidden="true">
          🔔
        </span>
        <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
          Pending Claimable Balances ({activeBalances.length})
        </h3>
      </div>

      <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mb-3">
        You have incoming escrow funds awaiting claim on the Stellar network. Claim them to credit
        your wallet.
      </p>

      {error && (
        <div role="alert" className="text-xs text-red-600 dark:text-red-400 mb-2">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {activeBalances.map((item) => {
          const isThisClaiming = claimingId === item.id || isLoading;

          return (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-amber-100 dark:border-amber-900/40"
            >
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {item.amount} {item.asset}
                </div>
                <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate max-w-xs">
                  Sponsor: {item.sponsor.slice(0, 8)}...{item.sponsor.slice(-6)}
                </div>
              </div>

              <button
                type="button"
                disabled={!item.canClaim || isThisClaiming}
                onClick={() => handleClaimClick(item.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-colors ${
                  item.canClaim && !isThisClaiming
                    ? "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                    : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed"
                }`}
              >
                {isThisClaiming
                  ? "Claiming..."
                  : item.canClaim
                  ? "Claim Funds"
                  : "Predicate Locked"}
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
