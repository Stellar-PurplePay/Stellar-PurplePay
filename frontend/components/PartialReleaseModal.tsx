import React, { useState } from "react";

export interface PartialReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: string) => Promise<void> | void;
  jobId: string;
  milestoneId: number;
  totalMilestoneAmount: string;
  remainingMilestoneAmount: string;
  asset?: string;
  isSubmitting?: boolean;
}

export const PartialReleaseModal: React.FC<PartialReleaseModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  jobId,
  milestoneId,
  totalMilestoneAmount,
  remainingMilestoneAmount,
  asset = "XLM",
  isSubmitting = false,
}) => {
  const [releaseAmount, setReleaseAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalNum = parseFloat(totalMilestoneAmount) || 0;
  const remainingNum = parseFloat(remainingMilestoneAmount) || 0;
  const inputNum = parseFloat(releaseAmount) || 0;
  const projectedRemaining = Math.max(0, remainingNum - inputNum);

  const handlePreset = (pct: number) => {
    const calculated = (remainingNum * (pct / 100)).toFixed(7);
    // Trim trailing zeroes for clean display
    const trimmed = parseFloat(calculated).toString();
    setReleaseAmount(trimmed);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseAmount || inputNum <= 0) {
      setError("Please enter a positive amount to release.");
      return;
    }
    if (inputNum > remainingNum) {
      setError(`Cannot release more than the remaining milestone balance (${remainingNum} ${asset}).`);
      return;
    }
    setError(null);
    await onConfirm(releaseAmount);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="partial-release-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b pb-4 dark:border-zinc-800">
          <div>
            <h2 id="partial-release-title" className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Partial Milestone Release
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Job: <span className="font-mono text-xs">{jobId}</span> · Milestone #{milestoneId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
              <span className="block text-xs font-medium text-zinc-500">Total Milestone</span>
              <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                {totalNum.toLocaleString()} {asset}
              </span>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
              <span className="block text-xs font-medium text-zinc-500">Available to Release</span>
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {remainingNum.toLocaleString()} {asset}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
              Quick Presets (% of Available)
            </label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePreset(pct)}
                  className="rounded-lg border border-zinc-200 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="partial-amount-input" className="block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
              Amount to Release ({asset})
            </label>
            <input
              id="partial-amount-input"
              type="text"
              placeholder={`e.g. ${(remainingNum / 2).toFixed(2)}`}
              value={releaseAmount}
              onChange={(e) => {
                setReleaseAmount(e.target.value);
                setError(null);
              }}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
            <span className="block font-medium text-zinc-700 dark:text-zinc-200">
              Remaining Milestone Balance After Release:
            </span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {projectedRemaining.toFixed(7)} {asset}
            </span>
            {projectedRemaining === 0 && inputNum > 0 && (
              <span className="block mt-1 text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ This release will fully complete Milestone #{milestoneId}.
              </span>
            )}
          </div>

          {error && (
            <div role="alert" className="rounded-lg bg-rose-50 p-2.5 text-xs font-medium text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 border-t pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? "Releasing Payout..." : `Release ${releaseAmount ? `${releaseAmount} ${asset}` : "Payout"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
