import React, { useEffect, useState } from "react";

export interface MilestoneCountdownTimerProps {
  deadlineTimestamp?: number | null;
  isApproved?: boolean;
  onExpired?: () => void;
  className?: string;
}

export const MilestoneCountdownTimer: React.FC<MilestoneCountdownTimerProps> = ({
  deadlineTimestamp,
  isApproved = false,
  onExpired,
  className = "",
}) => {
  const [now, setNow] = useState<number>(Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (!deadlineTimestamp || isApproved) return;

    const interval = setInterval(() => {
      const currentSec = Math.floor(Date.now() / 1000);
      setNow(currentSec);

      if (currentSec >= deadlineTimestamp && onExpired) {
        onExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadlineTimestamp, isApproved, onExpired]);

  if (isApproved) {
    return (
      <span
        role="status"
        className={`inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 ${className}`}
      >
        ✓ Completed
      </span>
    );
  }

  if (!deadlineTimestamp || deadlineTimestamp <= 0) {
    return (
      <span
        role="status"
        className={`inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 ${className}`}
      >
        No deadline set
      </span>
    );
  }

  const secondsRemaining = deadlineTimestamp - now;

  if (secondsRemaining <= 0) {
    return (
      <span
        role="alert"
        aria-live="polite"
        className={`inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Deadline Expired
      </span>
    );
  }

  const days = Math.floor(secondsRemaining / 86400);
  const hours = Math.floor((secondsRemaining % 86400) / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  const isDueSoon = secondsRemaining < 86400; // less than 24 hours

  const formattedTime =
    days > 0
      ? `${days}d ${hours}h ${minutes}m`
      : `${hours}h ${minutes}m ${seconds}s`;

  return (
    <div
      role="timer"
      aria-label={`Time remaining: ${formattedTime}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isDueSoon
          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
          : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
      } ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isDueSoon ? "bg-amber-500 animate-pulse" : "bg-indigo-500"
        }`}
      />
      <span>{formattedTime} remaining</span>
    </div>
  );
};
