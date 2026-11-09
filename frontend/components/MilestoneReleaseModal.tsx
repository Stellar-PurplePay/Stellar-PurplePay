import React, { useState } from "react";

export interface MilestoneReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  milestone: {
    id: number;
    title: string;
    amount: number | string;
    percentage?: number;
  } | null;
  freelancerAddress: string;
  tokenSymbol?: string;
  onConfirmRelease: (milestoneId: number) => Promise<void>;
}

export const MilestoneReleaseModal: React.FC<MilestoneReleaseModalProps> = ({
  isOpen,
  onClose,
  jobId,
  milestone,
  freelancerAddress,
  tokenSymbol = "XLM",
  onConfirmRelease,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !milestone) return null;

  const numericAmount = typeof milestone.amount === "string" ? parseFloat(milestone.amount) : milestone.amount;
  const platformFee = numericAmount * 0.02; // 2% platform fee
  const netAmount = numericAmount - platformFee;

  const handleRelease = async () => {
    if (!confirmed) {
      setError("Please confirm deliverable acceptance before releasing funds.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirmRelease(milestone.id);
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to release milestone funds on-chain");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="milestone-release-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b pb-3 dark:border-gray-700">
          <h2 id="milestone-release-title" className="text-xl font-bold text-gray-900 dark:text-white">
            Approve & Release Milestone
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">Milestone #{milestone.id}</span>
            <p className="font-semibold text-gray-900 dark:text-white">{milestone.title}</p>
          </div>

          <div className="rounded-lg border p-4 space-y-2 dark:border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">Disbursement Amount:</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">
                {numericAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tokenSymbol}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Platform Protocol Fee (2%):</span>
              <span className="font-mono">
                - {platformFee.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tokenSymbol}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 text-sm font-bold dark:border-gray-700">
              <span className="text-emerald-700 dark:text-emerald-400">Net to Freelancer:</span>
              <span className="font-mono text-emerald-700 dark:text-emerald-400">
                {netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tokenSymbol}
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span>Recipient: </span>
            <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
              {freelancerAddress.slice(0, 8)}...{freelancerAddress.slice(-8)}
            </span>
          </div>

          <label className="flex items-start gap-2 pt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={isSubmitting}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-gray-600 dark:text-gray-300">
              I have reviewed and approved all deliverables for this milestone. I understand this on-chain transaction is irreversible.
            </span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRelease}
            disabled={!confirmed || isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting to Stellar..." : "Confirm & Release"}
          </button>
        </div>
      </div>
    </div>
  );
};
