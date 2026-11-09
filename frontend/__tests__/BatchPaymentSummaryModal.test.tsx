import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BatchPaymentSummaryModal } from "../components/BatchPaymentSummaryModal";

describe("BatchPaymentSummaryModal", () => {
  const dummyRecipients = [
    { destination: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5", amount: "50.0" },
    { destination: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN", amount: "150.0" },
  ];

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <BatchPaymentSummaryModal
        isOpen={false}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        recipients={dummyRecipients}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders recipient summary metrics when open", () => {
    render(
      <BatchPaymentSummaryModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        recipients={dummyRecipients}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Batch Payment Confirmation")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThan(0); // 2 recipients
    expect(screen.getByText("200.00")).toBeInTheDocument(); // total XLM
    expect(screen.getByText("GBBD47...LLFLA5")).toBeInTheDocument();
  });

  it("calls onConfirm when execute button is clicked", () => {
    const handleConfirm = jest.fn();
    render(
      <BatchPaymentSummaryModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={handleConfirm}
        recipients={dummyRecipients}
      />
    );

    const button = screen.getByRole("button", { name: /Sign & Execute Batch/i });
    fireEvent.click(button);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Cancel button or close icon is clicked", () => {
    const handleClose = jest.fn();
    render(
      <BatchPaymentSummaryModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={jest.fn()}
        recipients={dummyRecipients}
      />
    );

    fireEvent.click(screen.getByText("Cancel"));
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it("shows empty state when no recipients provided", () => {
    render(
      <BatchPaymentSummaryModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        recipients={[]}
      />
    );

    expect(screen.getByText("No recipients configured for this payout.")).toBeInTheDocument();
  });
});
