import { renderHook, act } from "@testing-library/react";
import { useSessionExpiry } from "../hooks/useSessionExpiry";

describe("useSessionExpiry hook", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("calculates remaining seconds and formats time correctly", () => {
    const now = 1000;
    jest.setSystemTime(now * 1000);

    const { result } = renderHook(() =>
      useSessionExpiry({
        expiresAt: now + 3665, // 1 hour 1 minute 5 seconds
      })
    );

    expect(result.current.remainingSeconds).toBe(3665);
    expect(result.current.formattedTime).toBe("01:01:05");
    expect(result.current.isExpired).toBe(false);
    expect(result.current.isWarning).toBe(false);
  });

  it("enters warning state and triggers onWarning callback", () => {
    const now = 1000;
    jest.setSystemTime(now * 1000);
    const onWarning = jest.fn();

    const { result } = renderHook(() =>
      useSessionExpiry({
        expiresAt: now + 200, // <= 300s default warning
        warningThresholdSeconds: 300,
        onWarning,
      })
    );

    expect(result.current.isWarning).toBe(true);
    expect(onWarning).toHaveBeenCalledTimes(1);
  });

  it("triggers onExpired when countdown reaches 0", () => {
    const now = 1000;
    jest.setSystemTime(now * 1000);
    const onExpired = jest.fn();

    const { result } = renderHook(() =>
      useSessionExpiry({
        expiresAt: now + 3,
        onExpired,
      })
    );

    expect(result.current.remainingSeconds).toBe(3);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.isExpired).toBe(true);
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.formattedTime).toBe("00:00");
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it("handles manual session refresh", async () => {
    const now = 1000;
    jest.setSystemTime(now * 1000);
    const onRefresh = jest.fn().mockResolvedValue(now + 1800);

    const { result } = renderHook(() =>
      useSessionExpiry({
        expiresAt: now + 50,
        onRefresh,
      })
    );

    expect(result.current.remainingSeconds).toBe(50);

    await act(async () => {
      await result.current.refresh();
    });

    expect(onRefresh).toHaveBeenCalled();
    expect(result.current.remainingSeconds).toBe(1800);
    expect(result.current.isWarning).toBe(false);
  });
});
