import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ResponsiveEscrowSummaryCard } from "../components/ResponsiveEscrowSummaryCard";

describe("ResponsiveEscrowSummaryCard", () => {
  const mockProps = {
    jobId: "escrow-job-500",
    client: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    freelancer: "GAPTL2OLC4YDSJJ6MGT3MMBWIYD4GSVKQFU26647IOMBEEXUURNUM32X",
    totalAmount: 10000,
    releasedAmount: 4000,
    status: "InProgress",
    tokenSymbol: "XLM",
    milestonesCount: 3,
  };

  it("renders escrow details, amounts, and status badge", () => {
    render(<ResponsiveEscrowSummaryCard {...mockProps} />);

    expect(screen.getByText("escrow-job-500")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("10,000.00 XLM")).toBeInTheDocument();
    expect(screen.getByText("4,000.00 XLM")).toBeInTheDocument();
    expect(screen.getByText("6,000.00 XLM")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("toggles mobile drawer expansion", () => {
    render(<ResponsiveEscrowSummaryCard {...mockProps} />);

    const toggleBtn = screen.getByRole("button", { name: "Toggle details breakdown" });
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
    expect(toggleBtn).toHaveTextContent("Hide");
  });

  it("dispatches actions when action buttons are clicked", () => {
    const mockAction = jest.fn();
    render(<ResponsiveEscrowSummaryCard {...mockProps} onActionClick={mockAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Release Milestone" }));
    expect(mockAction).toHaveBeenCalledWith("release_funds");

    fireEvent.click(screen.getByRole("button", { name: "Raise Dispute" }));
    expect(mockAction).toHaveBeenCalledWith("raise_dispute");

    fireEvent.click(screen.getByRole("button", { name: "View Deliverables" }));
    expect(mockAction).toHaveBeenCalledWith("view_deliverables");
  });

  it("does not render release or dispute buttons for Completed status", () => {
    const mockAction = jest.fn();
    render(
      <ResponsiveEscrowSummaryCard
        {...mockProps}
        status="Completed"
        onActionClick={mockAction}
      />
    );

    expect(screen.getByText("Settled / Complete")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Release Milestone" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Raise Dispute" })).toBeNull();
  });
});
