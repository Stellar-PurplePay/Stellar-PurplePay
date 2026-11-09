import { renderHook, act } from "@testing-library/react";
import { useMilestoneCountdown } from "../hooks/useMilestoneCountdown";

describe("useMilestoneCountdown", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("handles null or zero deadline correctly", () => {
    const { result } = renderHook(() => useMilestoneCountdown(null));
    expect(result.current.hasDeadline).toBe(false);
    expect(result.current.isExpired).toBe(false);
    expect(result.current.formattedRemaining).toBe("No deadline");
  });

  it("computes active countdown for future deadline", () => {
    const nowSec = 1700000000;
    jest.setSystemTime(nowSec * 1000);

    const deadline = nowSec + 90000; // 1 day, 1 hour
    const { result } = renderHook(() => useMilestoneCountdown(deadline));

    expect(result.current.hasDeadline).toBe(true);
    expect(result.current.isExpired).toBe(false);
    expect(result.current.days).toBe(1);
    expect(result.current.hours).toBe(1);
    expect(result.current.formattedRemaining).toBe("1d 1h 0m");
  });

  it("identifies due soon when less than 24 hours remaining", () => {
    const nowSec = 1700000000;
    jest.setSystemTime(nowSec * 1000);

    const deadline = nowSec + 3600; // 1 hour
    const { result } = renderHook(() => useMilestoneCountdown(deadline));

    expect(result.current.isDueSoon).toBe(true);
    expect(result.current.isExpired).toBe(false);
    expect(result.current.formattedRemaining).toBe("1h 0m 0s");
  });

  it("flags expired when deadline is past", () => {
    const nowSec = 1700000000;
    jest.setSystemTime(nowSec * 1000);

    const pastDeadline = nowSec - 500;
    const { result } = renderHook(() => useMilestoneCountdown(pastDeadline));

    expect(result.current.isExpired).toBe(true);
    expect(result.current.formattedRemaining).toBe("Expired");
  });

  it("returns completed when isApproved is true regardless of deadline", () => {
    const nowSec = 1700000000;
    jest.setSystemTime(nowSec * 1000);

    const pastDeadline = nowSec - 500;
    const { result } = renderHook(() => useMilestoneCountdown(pastDeadline, true));

    expect(result.current.isExpired).toBe(false);
    expect(result.current.formattedRemaining).toBe("Completed");
  });

  it("ticks down over time", () => {
    const nowSec = 1700000000;
    jest.setSystemTime(nowSec * 1000);

    const deadline = nowSec + 10;
    const { result } = renderHook(() => useMilestoneCountdown(deadline));

    expect(result.current.secondsRemaining).toBe(10);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.secondsRemaining).toBe(7);
  });
});
