import React from "react";
import { PreflightSimulationCost } from "../lib/preflightSimulator";

export interface PreflightFeeModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  cost?: PreflightSimulationCost;
  loading?: boolean;
  error?: string;
}

export default function PreflightFeeModal({
  isOpen,
  onConfirm,
  onCancel,
  title = "Review Transaction & Network Fees",
  cost,
  loading = false,
  error,
}: PreflightFeeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preflight-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-2xl text-white">
        <h3
          id="preflight-modal-title"
          className="text-lg font-semibold text-white mb-2"
        >
          {title}
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Simulation completed on Soroban RPC. Verify resource fees before authorizing with Freighter.
        </p>

        {loading ? (
          <div className="py-8 text-center text-gray-400">
            <span className="inline-block animate-spin mr-2">⟳</span>
            Simulating transaction footprint...
          </div>
        ) : error ? (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-red-950/60 border border-red-800/80 p-3 text-sm text-red-200"
          >
            <strong>Simulation Warning:</strong> {error}
          </div>
        ) : cost ? (
          <div className="space-y-3 mb-6 rounded-lg bg-gray-800/50 p-4 border border-gray-700/50">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Estimated Resource Fee:</span>
              <span className="font-mono text-emerald-400 font-semibold">
                {cost.minResourceFeeXlm} XLM
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Stroops:</span>
              <span className="font-mono">{cost.minResourceFeeStroops.toLocaleString()} stroops</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>CPU Instructions:</span>
              <span className="font-mono">{cost.cpuInstructions.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Memory Footprint:</span>
              <span className="font-mono">{(cost.memoryBytes / 1024).toFixed(1)} KB</span>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !!error}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors shadow-lg shadow-purple-600/30"
          >
            Sign & Submit
          </button>
        </div>
      </div>
    </div>
  );
}
