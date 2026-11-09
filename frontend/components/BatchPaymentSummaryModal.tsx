import React from "react";

export interface BatchRecipient {
  destination: string;
  amount: string;
  asset?: string;
}

export interface BatchPaymentSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recipients: BatchRecipient[];
  isSubmitting?: boolean;
  baseFeeStroops?: number;
}

const MAX_OPS_PER_TX = 100;

export const BatchPaymentSummaryModal: React.FC<BatchPaymentSummaryModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  recipients,
  isSubmitting = false,
  baseFeeStroops = 100,
}) => {
  if (!isOpen) return null;

  const totalPayments = recipients.length;
  const totalAmount = recipients.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const requiredChunks = Math.max(1, Math.ceil(totalPayments / MAX_OPS_PER_TX));
  const estimatedFeeStroops = totalPayments * baseFeeStroops;
  const estimatedFeeXlm = (estimatedFeeStroops / 10_000_000).toFixed(7);

  const truncateAddress = (addr: string) => {
    if (!addr || addr.length < 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b pb-4 dark:border-zinc-800">
          <div>
            <h2 id="batch-modal-title" className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Batch Payment Confirmation
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Review multi-recipient transaction envelopes before signing
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        {totalPayments === 0 ? (
          <div className="my-6 rounded-lg bg-zinc-50 p-4 text-center text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            No recipients configured for this payout.
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="my-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                <span className="block text-xs font-medium text-zinc-500">Recipients</span>
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {totalPayments}
                </span>
              </div>
              <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                <span className="block text-xs font-medium text-zinc-500">Total Value</span>
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })}{" "}
                  <span className="text-xs font-normal">XLM</span>
                </span>
              </div>
              <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                <span className="block text-xs font-medium text-zinc-500">Transactions</span>
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {requiredChunks} <span className="text-xs font-normal text-zinc-400">({MAX_OPS_PER_TX} max/tx)</span>
                </span>
              </div>
              <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
                <span className="block text-xs font-medium text-zinc-500">Network Fee</span>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {estimatedFeeXlm} XLM
                </span>
                <span className="block text-xs text-zinc-400">{estimatedFeeStroops} stroops</span>
              </div>
            </div>

            {/* Recipient Table */}
            <div className="my-4 max-h-56 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-zinc-100 text-xs font-semibold uppercase text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Destination</th>
                    <th className="py-2.5 px-3">Asset</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {recipients.map((r, i) => (
                    <tr key={`${r.destination}-${i}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-850">
                      <td className="py-2 px-3 text-xs text-zinc-400">{i + 1}</td>
                      <td className="py-2 px-3 font-mono text-xs text-zinc-800 dark:text-zinc-200" title={r.destination}>
                        {truncateAddress(r.destination)}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                          {r.asset || "XLM"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-zinc-900 dark:text-zinc-100">
                        {r.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end space-x-3 border-t pt-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || totalPayments === 0}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting Envelopes..." : `Sign & Execute Batch (${totalPayments})`}
          </button>
        </div>
      </div>
    </div>
  );
};
