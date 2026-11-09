import React, { useEffect } from "react";
import { StreamPayment } from "../hooks/useStellarPaymentStream";

export interface LivePaymentNotificationProps {
  payment: StreamPayment | null;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export const LivePaymentNotification: React.FC<LivePaymentNotificationProps> = ({
  payment,
  onDismiss,
  autoDismissMs = 6000,
}) => {
  useEffect(() => {
    if (!payment) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [payment, onDismiss, autoDismissMs]);

  if (!payment) return null;

  const truncate = (addr: string) => {
    if (!addr || addr.length < 12) return addr;
    return `${addr.slice(0, 5)}...${addr.slice(-5)}`;
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl dark:border-emerald-900/50 dark:bg-zinc-900"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400">
            Payment Confirmed
          </span>
          <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            {payment.asset}
          </span>
        </div>
        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          +{payment.amount} {payment.asset}
        </p>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          From: <span className="font-mono">{truncate(payment.from)}</span>
        </p>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss payment notification"
        className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
      >
        ✕
      </button>
    </div>
  );
};
