import React, { useState } from "react";

export interface MilestoneExtensionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  milestoneId: number;
  currentDeadline: number; // Unix timestamp in seconds
  onRequestExtension: (
    jobId: string,
    milestoneId: number,
    additionalDays: number,
    reason: string
  ) => Promise<void>;
}

export const MilestoneExtensionRequestModal: React.FC<MilestoneExtensionRequestModalProps> = ({
  isOpen,
  onClose,
  jobId,
  milestoneId,
  currentDeadline,
  onRequestExtension,
}) => {
  const [additionalDays, setAdditionalDays] = useState<number>(7);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentDeadlineMs = currentDeadline * 1000;
  const newDeadlineMs = currentDeadlineMs + additionalDays * 24 * 60 * 60 * 1000;

  const formatDate = (ms: number) => {
    return new Date(ms).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (additionalDays < 1 || additionalDays > 60) {
      setError("Extension request must be between 1 and 60 days.");
      return;
    }
    if (reason.trim().length < 10) {
      setError("Please provide a substantive justification (at least 10 characters).");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onRequestExtension(jobId, milestoneId, additionalDays, reason.trim());
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to submit extension request.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="extension-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b pb-3 dark:border-gray-700">
          <h2 id="extension-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">
            Request Deadline Extension
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
          <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-700">
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Current Target Deadline:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{formatDate(currentDeadlineMs)}</span>
            </div>
            <div className="mt-1 flex justify-between text-indigo-700 dark:text-indigo-400 font-medium">
              <span>Proposed New Deadline:</span>
              <span className="font-bold">{formatDate(newDeadlineMs)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Select Additional Days (+{additionalDays} days)
            </label>
            <div className="flex gap-2">
              {[3, 7, 14, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setAdditionalDays(days)}
                  disabled={isSubmitting}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                    additionalDays === days
                      ? "bg-indigo-600 text-white"
                      : "border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200"
                  }`}
                >
                  +{days}d
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="extension-reason" className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Justification & Progress Update
            </label>
            <textarea
              id="extension-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              placeholder="Explain roadblocks, scope change, or testnet integration requirements..."
              className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-xs text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || additionalDays < 1 || reason.trim().length < 10}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting Request..." : "Send Extension Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

