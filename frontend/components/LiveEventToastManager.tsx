import React, { useState, useEffect } from "react";

export interface LiveEventToast {
  id: string;
  type: "released" | "disputed" | "resolved" | "refunded";
  jobId: string;
  title: string;
  message: string;
  timestamp: number;
}

export interface LiveEventToastManagerProps {
  toasts?: LiveEventToast[];
  onDismissToast?: (id: string) => void;
  autoDismissMs?: number;
}

const TYPE_CONFIG = {
  released: {
    icon: "💰",
    badge: "Milestone Released",
    border: "border-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    titleColor: "text-emerald-900 dark:text-emerald-200",
  },
  disputed: {
    icon: "⚠️",
    badge: "Dispute Opened",
    border: "border-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    titleColor: "text-amber-900 dark:text-amber-200",
  },
  resolved: {
    icon: "⚖️",
    badge: "Dispute Resolved",
    border: "border-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    titleColor: "text-indigo-900 dark:text-indigo-200",
  },
  refunded: {
    icon: "↩️",
    badge: "Funds Refunded",
    border: "border-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    titleColor: "text-purple-900 dark:text-purple-200",
  },
};

export const LiveEventToastManager: React.FC<LiveEventToastManagerProps> = ({
  toasts = [],
  onDismissToast,
  autoDismissMs = 5000,
}) => {
  const [activeToasts, setActiveToasts] = useState<LiveEventToast[]>(toasts);

  useEffect(() => {
    setActiveToasts(toasts);
  }, [toasts]);

  useEffect(() => {
    if (activeToasts.length === 0 || !onDismissToast) return;

    const timer = setTimeout(() => {
      const oldest = activeToasts[0];
      if (oldest) {
        onDismissToast(oldest.id);
      }
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [activeToasts, onDismissToast, autoDismissMs]);

  const handleDismiss = (id: string) => {
    if (onDismissToast) {
      onDismissToast(id);
    } else {
      setActiveToasts((prev) => prev.filter((t) => t.id !== id));
    }
  };

  if (activeToasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Real-time on-chain notifications"
      className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2 pointer-events-none"
    >
      <div role="status" aria-live="polite" className="sr-only">
        {activeToasts.length} active notifications
      </div>

      {activeToasts.map((toast) => {
        const config = TYPE_CONFIG[toast.type] || TYPE_CONFIG.released;

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border-l-4 p-4 shadow-lg backdrop-blur-sm transition-all ${config.border} ${config.bg} bg-white dark:bg-gray-800`}
          >
            <span className="text-xl" aria-hidden="true">
              {config.icon}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {config.badge}
                </span>
                <span className="font-mono text-[10px] text-gray-400">
                  {new Date(toast.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
              <h4 className={`text-xs font-bold ${config.titleColor} truncate mt-0.5`}>
                {toast.title}
              </h4>
              <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
                {toast.message}
              </p>
              <div className="mt-1 font-mono text-[11px] text-gray-400 truncate">
                Job: {toast.jobId}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDismiss(toast.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
};

