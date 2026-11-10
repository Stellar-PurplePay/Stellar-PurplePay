import React, { useState, useEffect } from "react";

export interface ArbitratorSplitSliderProps {
  disputedAmount: number;
  tokenSymbol?: string;
  clientAddress: string;
  freelancerAddress: string;
  initialClientPercentage?: number;
  onSplitChange?: (clientPercentage: number, clientAmount: number, freelancerAmount: number) => void;
  onConfirmSplit: (clientAmount: number, freelancerAmount: number) => Promise<void>;
  disabled?: boolean;
}

export const ArbitratorSplitSlider: React.FC<ArbitratorSplitSliderProps> = ({
  disputedAmount,
  tokenSymbol = "XLM",
  clientAddress,
  freelancerAddress,
  initialClientPercentage = 50,
  onSplitChange,
  onConfirmSplit,
  disabled = false,
}) => {
  const [clientPercent, setClientPercent] = useState(initialClientPercentage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const freelancerPercent = 100 - clientPercent;
  const clientAmount = (disputedAmount * clientPercent) / 100;
  const freelancerAmount = disputedAmount - clientAmount;

  useEffect(() => {
    if (onSplitChange) {
      onSplitChange(clientPercent, clientAmount, freelancerAmount);
    }
  }, [clientPercent, clientAmount, freelancerAmount, onSplitChange]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
    setClientPercent(val);
  };

  const handlePreset = (pct: number) => {
    if (disabled || isSubmitting) return;
    setClientPercent(pct);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirmSplit(clientAmount, freelancerAmount);
      setIsSubmitting(false);
    } catch (err: any) {
      setError(err?.message || "Failed to commit dispute resolution on-chain");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between border-b pb-3 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Arbitrated Dispute Settlement
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Total Disputed Pool:{" "}
            <span className="font-mono font-semibold text-gray-900 dark:text-white">
              {disputedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tokenSymbol}
            </span>
          </p>
        </div>
        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
          Arbitrator Decision
        </span>
      </div>

      {error && (
        <div role="alert" className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Payout Distribution Cards */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-blue-900 dark:text-blue-300">Client Refund</span>
            <span className="font-bold text-blue-700 dark:text-blue-400">{clientPercent}%</span>
          </div>
          <p className="mt-1 font-mono text-lg font-bold text-blue-950 dark:text-blue-100">
            {clientAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tokenSymbol}
          </p>
          <p className="mt-1 truncate font-mono text-[11px] text-gray-500 dark:text-gray-400">
            {clientAddress.slice(0, 6)}...{clientAddress.slice(-6)}
          </p>
        </div>

        <div className="rounded-lg border border-purple-100 bg-purple-50/50 p-3 dark:border-purple-900/40 dark:bg-purple-950/20">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-purple-900 dark:text-purple-300">Freelancer Payout</span>
            <span className="font-bold text-purple-700 dark:text-purple-400">{freelancerPercent}%</span>
          </div>
          <p className="mt-1 font-mono text-lg font-bold text-purple-950 dark:text-purple-100">
            {freelancerAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tokenSymbol}
          </p>
          <p className="mt-1 truncate font-mono text-[11px] text-gray-500 dark:text-gray-400">
            {freelancerAddress.slice(0, 6)}...{freelancerAddress.slice(-6)}
          </p>
        </div>
      </div>

      {/* Interactive Slider */}
      <div className="mt-6">
        <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
          <span>Client: {clientPercent}%</span>
          <span>Freelancer: {freelancerPercent}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={clientPercent}
          onChange={handleSliderChange}
          disabled={disabled || isSubmitting}
          aria-label="Dispute split ratio"
          aria-valuenow={clientPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-indigo-600 dark:bg-gray-700"
        />
      </div>

      {/* Preset Quick Buttons */}
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          { label: "100% Client", pct: 100 },
          { label: "75/25 Client", pct: 75 },
          { label: "50/50 Split", pct: 50 },
          { label: "25/75 Freelancer", pct: 25 },
          { label: "100% Freelancer", pct: 0 },
        ].map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handlePreset(preset.pct)}
            disabled={disabled || isSubmitting}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              clientPercent === preset.pct
                ? "bg-indigo-600 text-white"
                : "border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Conservation Verification Note */}
      <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
        Total split sum: {(clientAmount + freelancerAmount).toFixed(2)} / {disputedAmount.toFixed(2)} {tokenSymbol} (100% Conserved)
      </p>

      {/* Execution Button */}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={disabled || isSubmitting}
        className="mt-4 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {isSubmitting ? "Submitting Settlement..." : "Enforce Arbitrated Settlement"}
      </button>
    </div>
  );
};

