import { renderHook, act } from "@testing-library/react";
import { usePartialRelease } from "../hooks/usePartialRelease";

describe("usePartialRelease", () => {
  it("initializes with correct remaining balance", () => {
    const { result } = renderHook(() =>
      usePartialRelease({
        totalAmount: "100.0",
        alreadyReleased: "25.0",
        feeBps: 100, // 1%
      })
    );

    expect(result.current.remainingAmount).toBe(75.0);
    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("calculates breakdown when input is set", () => {
    const { result } = renderHook(() =>
      usePartialRelease({
        totalAmount: "100.0",
        alreadyReleased: "0",
        feeBps: 100, // 1%
      })
    );

    act(() => {
      result.current.setInputAmount("50.0");
    });

    expect(result.current.isValid).toBe(true);
    expect(result.current.platformFee).toBe(0.5);
    expect(result.current.payoutAmount).toBe(49.5);
    expect(result.current.projectedRemaining).toBe(50.0);
    expect(result.current.isFullyCompleted).toBe(false);
  });

  it("calculates preset percentage", () => {
    const { result } = renderHook(() =>
      usePartialRelease({
        totalAmount: "200.0",
        alreadyReleased: "0",
      })
    );

    act(() => {
      result.current.setPercentage(50);
    });

    expect(result.current.inputAmount).toBe("100");
    expect(result.current.projectedRemaining).toBe(100);
  });

  it("identifies full completion when 100% is released", () => {
    const { result } = renderHook(() =>
      usePartialRelease({
        totalAmount: "50.0",
        alreadyReleased: "0",
      })
    );

    act(() => {
      result.current.setPercentage(100);
    });

    expect(result.current.projectedRemaining).toBe(0);
    expect(result.current.isFullyCompleted).toBe(true);
  });

  it("sets error when amount exceeds remaining balance", () => {
    const { result } = renderHook(() =>
      usePartialRelease({
        totalAmount: "50.0",
        alreadyReleased: "10.0",
      })
    );

    act(() => {
      result.current.setInputAmount("45.0"); // 45 > 40
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toContain("cannot exceed remaining balance");
  });

  it("resets state when reset is called", () => {
    const { result } = renderHook(() =>
      usePartialRelease({
        totalAmount: "50.0",
      })
    );

    act(() => {
      result.current.setInputAmount("20");
    });
    expect(result.current.inputAmount).toBe("20");

    act(() => {
      result.current.reset();
    });
    expect(result.current.inputAmount).toBe("");
    expect(result.current.error).toBeNull();
  });
});
