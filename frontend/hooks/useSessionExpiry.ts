"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface UseSessionExpiryOptions {
  expiresAt?: number | null;
  warningThresholdSeconds?: number;
  onWarning?: () => void;
  onExpired?: () => void;
  autoRefresh?: boolean;
  onRefresh?: () => Promise<number | void>;
}

export interface UseSessionExpiryResult {
  remainingSeconds: number;
  isExpired: boolean;
  isWarning: boolean;
  formattedTime: string;
  refresh: () => Promise<void>;
}

function normalizeTimestamp(ts: number | null | undefined): number | null {
  if (ts === null || ts === undefined || isNaN(ts)) return null;
  // If in milliseconds, convert to seconds
  return ts > 1e11 ? Math.floor(ts / 1000) : ts;
}

function formatRemaining(totalSec: number): string {
  if (totalSec <= 0) return "00:00";
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (hours > 0) {
    const hh = String(hours).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export function useSessionExpiry({
  expiresAt: initialExpiresAt,
  warningThresholdSeconds = 300,
  onWarning,
  onExpired,
  autoRefresh = false,
  onRefresh,
}: UseSessionExpiryOptions): UseSessionExpiryResult {
  const [targetTimestamp, setTargetTimestamp] = useState<number | null>(() =>
    normalizeTimestamp(initialExpiresAt)
  );

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const norm = normalizeTimestamp(initialExpiresAt);
    if (!norm) return 0;
    return Math.max(0, norm - Math.floor(Date.now() / 1000));
  });

  const warnedRef = useRef(false);
  const expiredRef = useRef(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const norm = normalizeTimestamp(initialExpiresAt);
    setTargetTimestamp(norm);
    if (norm) {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, norm - now);
      setRemainingSeconds(remaining);
      warnedRef.current = remaining <= warningThresholdSeconds && remaining > 0;
      expiredRef.current = remaining === 0;
    }
  }, [initialExpiresAt, warningThresholdSeconds]);

  const refresh = useCallback(async () => {
    if (!onRefresh || refreshingRef.current) return;
    try {
      refreshingRef.current = true;
      const newExpiry = await onRefresh();
      if (typeof newExpiry === "number") {
        const norm = normalizeTimestamp(newExpiry);
        setTargetTimestamp(norm);
        warnedRef.current = false;
        expiredRef.current = false;
      }
    } finally {
      refreshingRef.current = false;
    }
  }, [onRefresh]);

  useEffect(() => {
    if (!targetTimestamp) {
      setRemainingSeconds(0);
      return;
    }

    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, targetTimestamp - now);
      setRemainingSeconds(remaining);

      if (remaining === 0 && !expiredRef.current) {
        expiredRef.current = true;
        if (onExpired) onExpired();
      } else if (
        remaining > 0 &&
        remaining <= warningThresholdSeconds &&
        !warnedRef.current
      ) {
        warnedRef.current = true;
        if (onWarning) onWarning();
        if (autoRefresh && onRefresh) {
          refresh();
        }
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetTimestamp, warningThresholdSeconds, onWarning, onExpired, autoRefresh, onRefresh, refresh]);

  const isExpired = targetTimestamp !== null && remainingSeconds === 0;
  const isWarning =
    targetTimestamp !== null &&
    !isExpired &&
    remainingSeconds <= warningThresholdSeconds;

  return {
    remainingSeconds,
    isExpired,
    isWarning,
    formattedTime: formatRemaining(remainingSeconds),
    refresh,
  };
}
