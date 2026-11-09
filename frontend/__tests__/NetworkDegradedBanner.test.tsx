import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { NetworkDegradedBanner } from "../components/NetworkDegradedBanner";

describe("NetworkDegradedBanner", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does not render when status is null", () => {
    const { container } = render(<NetworkDegradedBanner status={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders rate limited banner with countdown", () => {
    render(
      <NetworkDegradedBanner
        status="rate_limited"
        retryAfterSeconds={5}
      />
    );

    expect(screen.getByText("Stellar RPC Quota Exceeded")).toBeInTheDocument();
    expect(screen.getByText(/Automatic retry in/)).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders circuit open banner and handles retry click", () => {
    const onRetry = jest.fn();
    render(
      <NetworkDegradedBanner
        status="circuit_open"
        onRetry={onRetry}
      />
    );

    expect(
      screen.getByText("Stellar Soroban Upstream Degraded")
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: "Retry Now" });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when close button is clicked", () => {
    const onDismiss = jest.fn();
    render(
      <NetworkDegradedBanner
        status="degraded"
        onDismiss={onDismiss}
      />
    );

    const closeBtn = screen.getByRole("button", { name: "Dismiss network banner" });
    fireEvent.click(closeBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
