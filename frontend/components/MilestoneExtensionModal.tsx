import React, { useState } from "react";

export interface MilestoneExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (extensionSeconds: number, reason?: string) => Promise<void> | void;
  jobId: string;
  milestoneId: number;
  currentDeadlineTimestamp?: number | null;
  isSubmitting?: boolean;
}

export const MilestoneExtensionModal: React.FC<MilestoneExtensionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  jobId,
  milestoneId,
  currentDeadlineTimestamp,
  isSubmitting = false,
}) => {
  const [extensionDays, setExtensionDays] = useState<number>(3);
  const [customDays, setCustomDays] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const effectiveDays = customDays ? parseInt(customDays, 10) : extensionDays;
  const extensionSeconds = (effectiveDays || 0) * 86400;

  const baseSec = currentDeadlineTimestamp
    ? Math.max(currentDeadlineTimestamp, Math.floor(Date.now() / 1000))
    : Math.floor(Date.now() / 1000);
  const projectedDeadline = baseSec + extensionSeconds;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveDays || effectiveDays <= 0) {
      setError("Extension duration must be at least 1 day.");
      return;
    }
    if (effectiveDays > 365) {
      setError("Extension duration cannot exceed 365 days.");
      return;
    }
    setError(null);
    await onConfirm(extensionSeconds, reason.trim() || undefined);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="extension-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b pb-4 dark:border-zinc-800">
          <div>
            <h2 id="extension-modal-title" className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Extend Milestone Deadline
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
          <div>
            <span className="block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
              Extension Presets
            </span>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[1, 3, 7, 14].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => {
                    setExtensionDays(days);
                    setCustomDays("");
                    setError(null);
                  }}
                  className={`rounded-lg border py-2 text-xs font-medium transition-colors ${
                    !customDays && extensionDays === days
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300"
                      : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  +{days} {days === 1 ? "Day" : "Days"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="custom-days-input" className="block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
              Or Custom Days
            </label>
            <input
              id="custom-days-input"
              type="number"
              min="1"
              max="365"
              placeholder="e.g. 21"
              value={customDays}
              onChange={(e) => {
                setCustomDays(e.target.value);
                setError(null);
              }}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
            <span className="block font-medium text-zinc-700 dark:text-zinc-200">
              Projected New Deadline:
            </span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400">
              {new Date(projectedDeadline * 1000).toUTCString()}
            </span>
          </div>

          <div>
            <label htmlFor="extension-reason" className="block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
              Reason / Notes (Optional)
            </label>
            <textarea
              id="extension-reason"
              rows={2}
              placeholder="e.g. Additional scope revisions agreed in chat"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
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
              {isSubmitting ? "Extending On-Chain..." : `Confirm Extension (+${effectiveDays}d)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
