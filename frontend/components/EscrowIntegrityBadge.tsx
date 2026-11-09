import React from "react";

export interface EscrowIntegrityBadgeProps {
  isSynchronized: boolean;
  loading?: boolean;
  driftCount?: number;
  onSyncClick?: () => void;
}

export const EscrowIntegrityBadge: React.FC<EscrowIntegrityBadgeProps> = ({
  isSynchronized,
  loading = false,
  driftCount = 0,
  onSyncClick,
}) => {
  if (loading) {
    return (
      <span
        role="status"
        aria-label="Verifying On-Chain"
        className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
        Verifying On-Chain...
      </span>
    );
  }

  if (isSynchronized) {
    return (
      <span
        role="status"
        aria-label="Verified On-Chain"
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-500/30"
      >
        <span className="text-emerald-600 dark:text-emerald-400">✓</span>
        On-Chain Invariants Verified
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span
        role="status"
        aria-label="State Drift Detected"
        className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-500/30"
      >
        <span>⚠️</span>
        State Drift Detected {driftCount > 0 && `(${driftCount})`}
      </span>
      {onSyncClick && (
        <button
          type="button"
          onClick={onSyncClick}
          className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200 dark:hover:bg-amber-800"
        >
          Reconcile
        </button>
      )}
    </div>
  );
};
