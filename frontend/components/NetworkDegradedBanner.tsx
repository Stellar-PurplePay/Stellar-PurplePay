import React, { useState, useEffect } from "react";

export type NetworkDegradationStatus = "rate_limited" | "circuit_open" | "degraded" | null;

export interface NetworkDegradedBannerProps {
  status: NetworkDegradationStatus;
  retryAfterSeconds?: number;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export const NetworkDegradedBanner: React.FC<NetworkDegradedBannerProps> = ({
  status,
  retryAfterSeconds,
  onDismiss,
  onRetry,
}) => {
  const [countdown, setCountdown] = useState<number | null>(retryAfterSeconds ?? null);

  useEffect(() => {
    if (retryAfterSeconds !== undefined && retryAfterSeconds > 0) {
      setCountdown(retryAfterSeconds);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCountdown(null);
    }
  }, [retryAfterSeconds]);

  if (!status) return null;

  const isRateLimited = status === "rate_limited";
  const isCircuitOpen = status === "circuit_open";

  const bannerColor = isCircuitOpen
    ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
    : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200";

  const title = isCircuitOpen
    ? "Stellar Soroban Upstream Degraded"
    : isRateLimited
    ? "Stellar RPC Quota Exceeded"
    : "Network Latency Warning";

  const description = isCircuitOpen
    ? "Upstream RPC nodes are experiencing congestion. Circuit breaker is protecting your requests."
    : isRateLimited
    ? "You have reached the temporary rate limit. Connecting again shortly."
    : "Responses from the Stellar network are slower than usual.";

  return (
    <div
      role="alert"
      className={`relative flex items-center justify-between rounded-xl border p-4 shadow-sm transition-all ${bannerColor}`}
    >
      <div className="flex items-start space-x-3">
        <span className="text-xl select-none" aria-hidden="true">
          {isCircuitOpen ? "🛑" : "⚠️"}
        </span>
        <div>
          <h4 className="text-sm font-bold">{title}</h4>
          <p className="mt-0.5 text-xs opacity-90">{description}</p>
          {countdown !== null && countdown > 0 && (
            <p className="mt-1 text-xs font-semibold">
              Automatic retry in <span className="font-mono">{countdown}</span>s...
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-white/80 px-3 py-1.5 text-xs font-semibold shadow-sm hover:bg-white dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            Retry Now
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss network banner"
            className="rounded-lg p-1 text-xs opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};
