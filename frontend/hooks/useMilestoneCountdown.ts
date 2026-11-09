import { useState, useEffect } from "react";

export interface UseMilestoneCountdownResult {
  hasDeadline: boolean;
  isExpired: boolean;
  isDueSoon: boolean;
  secondsRemaining: number;
  formattedRemaining: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Custom hook calculating real-time remaining countdown for milestone deadlines.
 *
 * @param deadlineTimestamp - UNIX timestamp (in seconds) of the milestone deadline
 * @param isApproved - Whether the milestone has already been approved / released
 * @returns Breakdown of remaining time, expiration flags, and human-readable string
 */
export function useMilestoneCountdown(
  deadlineTimestamp?: number | null,
  isApproved = false
): UseMilestoneCountdownResult {
  const [now, setNow] = useState<number>(Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (!deadlineTimestamp || isApproved) return;

    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [deadlineTimestamp, isApproved]);

  if (!deadlineTimestamp || deadlineTimestamp <= 0) {
    return {
      hasDeadline: false,
      isExpired: false,
      isDueSoon: false,
      secondsRemaining: 0,
      formattedRemaining: "No deadline",
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const secondsRemaining = Math.max(0, deadlineTimestamp - now);
  const isExpired = !isApproved && now >= deadlineTimestamp;
  const isDueSoon = !isExpired && !isApproved && secondsRemaining < 86400; // < 24h

  const days = Math.floor(secondsRemaining / 86400);
  const hours = Math.floor((secondsRemaining % 86400) / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  let formattedRemaining: string;
  if (isApproved) {
    formattedRemaining = "Completed";
  } else if (isExpired) {
    formattedRemaining = "Expired";
  } else if (days > 0) {
    formattedRemaining = `${days}d ${hours}h ${minutes}m`;
  } else {
    formattedRemaining = `${hours}h ${minutes}m ${seconds}s`;
  }

  return {
    hasDeadline: true,
    isExpired,
    isDueSoon,
    secondsRemaining,
    formattedRemaining,
    days,
    hours,
    minutes,
    seconds,
  };
}
