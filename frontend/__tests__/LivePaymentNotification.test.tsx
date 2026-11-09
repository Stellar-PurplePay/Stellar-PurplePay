import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LivePaymentNotification } from "../components/LivePaymentNotification";

describe("LivePaymentNotification", () => {
  const dummyPayment = {
    id: "pay_101",
    type: "payment",
    from: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    to: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    amount: "75.0000000",
    asset: "USDC",
    txHash: "tx_abc_123",
    createdAt: "2026-11-09T22:00:00Z",
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does not render when payment is null", () => {
    const { container } = render(
      <LivePaymentNotification payment={null} onDismiss={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders payment details with asset badge and truncated sender", () => {
    render(<LivePaymentNotification payment={dummyPayment} onDismiss={jest.fn()} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Payment Confirmed")).toBeInTheDocument();
    expect(screen.getByText("+75.0000000 USDC")).toBeInTheDocument();
    expect(screen.getByText("GA5ZS...4KZVN")).toBeInTheDocument();
  });

  it("calls onDismiss when close button is clicked", () => {
    const handleDismiss = jest.fn();
    render(<LivePaymentNotification payment={dummyPayment} onDismiss={handleDismiss} />);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss payment notification" }));
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it("auto-dismisses after configured duration", () => {
    const handleDismiss = jest.fn();
    render(
      <LivePaymentNotification
        payment={dummyPayment}
        onDismiss={handleDismiss}
        autoDismissMs={4000}
      />
    );

    expect(handleDismiss).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });
});
