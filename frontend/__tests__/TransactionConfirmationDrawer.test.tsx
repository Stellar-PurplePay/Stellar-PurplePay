import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TransactionConfirmationDrawer } from "../components/TransactionConfirmationDrawer";

describe("TransactionConfirmationDrawer", () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn().mockResolvedValue(undefined),
    title: "Confirm Escrow Milestone Release",
    details: [
      { label: "Job ID", value: "job-confirm-101" },
      { label: "Amount", value: "2,500.00 XLM" },
      { label: "Beneficiary", value: "GAPTL2OLC4YDSJJ6..." },
    ],
    estimatedFee: "0.00001 XLM (100 stroops)",
  };

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <TransactionConfirmationDrawer {...mockProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders transaction details and fee breakdown", () => {
    render(<TransactionConfirmationDrawer {...mockProps} />);

    expect(screen.getByText("Confirm Escrow Milestone Release")).toBeInTheDocument();
    expect(screen.getByText("job-confirm-101")).toBeInTheDocument();
    expect(screen.getByText("2,500.00 XLM")).toBeInTheDocument();
    expect(screen.getByText("0.00001 XLM (100 stroops)")).toBeInTheDocument();
  });

  it("dismisses drawer when Escape key is pressed", () => {
    const mockClose = jest.fn();
    render(<TransactionConfirmationDrawer {...mockProps} onClose={mockClose} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("dispatches onConfirm when confirm button is clicked", () => {
    const mockConfirm = jest.fn().mockResolvedValue(undefined);
    render(<TransactionConfirmationDrawer {...mockProps} onConfirm={mockConfirm} />);

    const submitBtn = screen.getByRole("button", { name: "Sign & Submit Transaction" });
    fireEvent.click(submitBtn);

    expect(mockConfirm).toHaveBeenCalledTimes(1);
  });

  it("dispatches onClose when reject button or close X is clicked", () => {
    const mockClose = jest.fn();
    render(<TransactionConfirmationDrawer {...mockProps} onClose={mockClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(mockClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Close transaction drawer" }));
    expect(mockClose).toHaveBeenCalledTimes(2);
  });
});
