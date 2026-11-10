import React, { useEffect, useRef } from "react";

export interface TransactionConfirmationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  details: Array<{ label: string; value: string | number }>;
  estimatedFee?: string;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export const TransactionConfirmationDrawer: React.FC<TransactionConfirmationDrawerProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  details,
  estimatedFee = "0.00001 XLM (100 stroops)",
  isSubmitting = false,
  submitLabel = "Sign & Submit Transaction",
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus first focusable element inside drawer
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable && focusable.length > 0) {
        focusable[0].focus();
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
          return;
        }

        if (e.key === "Tab") {
          const focusables = drawerRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (!focusables || focusables.length === 0) return;

          const first = focusables[0];
          const last = focusables[focusables.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-0 sm:p-4"
    >
      <div
        ref={drawerRef}
        className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl dark:bg-gray-800"
      >
        <div className="flex items-center justify-between border-b pb-3 dark:border-gray-700">
          <h2 id="drawer-title" className="text-lg font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close transaction drawer"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-4 space-y-2.5 dark:border-gray-700 dark:bg-gray-700/40">
            {details.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">{item.label}:</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-white truncate max-w-[60%]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between rounded-lg bg-indigo-50/50 p-2.5 text-xs dark:bg-indigo-950/20">
            <span className="text-indigo-700 dark:text-indigo-300 font-medium">Estimated Network Fee:</span>
            <span className="font-mono font-semibold text-indigo-900 dark:text-indigo-200">{estimatedFee}</span>
          </div>

          <p className="text-[11px] text-gray-400">
            Clicking confirm will request your Stellar wallet (Freighter) signature for irreversible ledger submission.
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? "Signing with Wallet..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

