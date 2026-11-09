import React from "react";
import { useEscrowReconciliation } from "../hooks/useEscrowReconciliation";
import { EscrowIntegrityBadge } from "./EscrowIntegrityBadge";

export interface EscrowReconciliationCardProps {
  jobId: string;
  network?: "testnet" | "mainnet";
}

export const EscrowReconciliationCard: React.FC<EscrowReconciliationCardProps> = ({
  jobId,
}) => {
  const { isSynchronized, drifts, loading, error, sync } = useEscrowReconciliation(jobId);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Smart Contract Synchronization
          </h4>
          <p className="mt-0.5 text-xs text-zinc-500">
            Escrow ID: <span className="font-mono text-zinc-700 dark:text-zinc-300">{jobId}</span>
          </p>
        </div>

        <EscrowIntegrityBadge
          isSynchronized={isSynchronized}
          loading={loading}
          driftCount={drifts.length}
          onSyncClick={sync}
        />
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          ⚠️ {error}
        </div>
      )}

      {!isSynchronized && drifts.length > 0 && (
        <div className="mt-4 space-y-2 border-t pt-3 dark:border-zinc-800">
          <span className="block text-xs font-semibold text-amber-700 dark:text-amber-400">
            Detected Divergence Details:
          </span>
          <div className="space-y-1.5 text-xs">
            {drifts.map((drift, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800/60"
              >
                <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
                  {drift.field}
                </span>
                <span className="text-zinc-500">
                  DB: <span className="font-semibold">{String(drift.local)}</span> → Chain:{" "}
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {String(drift.onChain)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-zinc-400 dark:border-zinc-800">
        <span>Stellar Soroban Invariants Active</span>
        <button
          type="button"
          onClick={() => sync()}
          disabled={loading}
          className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          {loading ? "Verifying..." : "Verify Again ↻"}
        </button>
      </div>
    </div>
  );
};
