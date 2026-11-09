import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { EscrowIntegrityBadge } from "../components/EscrowIntegrityBadge";

describe("EscrowIntegrityBadge", () => {
  it("renders loading indicator when loading is true", () => {
    render(<EscrowIntegrityBadge isSynchronized={true} loading={true} />);
    expect(screen.getByText("Verifying On-Chain...")).toBeInTheDocument();
  });

  it("renders verified on-chain badge when synchronized", () => {
    render(<EscrowIntegrityBadge isSynchronized={true} />);
    expect(screen.getByText("On-Chain Invariants Verified")).toBeInTheDocument();
  });

  it("renders drift badge when synchronized is false", () => {
    render(<EscrowIntegrityBadge isSynchronized={false} driftCount={2} />);
    expect(screen.getByText("State Drift Detected (2)")).toBeInTheDocument();
  });

  it("triggers onSyncClick callback when reconcile button is clicked", () => {
    const onSyncClick = jest.fn();
    render(
      <EscrowIntegrityBadge
        isSynchronized={false}
        driftCount={1}
        onSyncClick={onSyncClick}
      />
    );

    const btn = screen.getByRole("button", { name: "Reconcile" });
    fireEvent.click(btn);
    expect(onSyncClick).toHaveBeenCalledTimes(1);
  });
});
