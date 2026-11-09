import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { NetworkCongestionIndicator } from "../components/NetworkCongestionIndicator";

describe("NetworkCongestionIndicator", () => {
  it("renders Optimal network state for normal traffic", () => {
    render(
      <NetworkCongestionIndicator
        feeMultiplier={1.0}
        latencyMs={600}
        ledgerSequence={504200}
      />
    );

    expect(screen.getByText("Stellar Network: Optimal")).toBeInTheDocument();
    expect(screen.getByText(/Low network load/)).toBeInTheDocument();
    expect(screen.getByText("600 ms")).toBeInTheDocument();
    expect(screen.getByText("1.00x")).toBeInTheDocument();
    expect(screen.getByText("#504200")).toBeInTheDocument();
  });

  it("renders Moderate Load for elevated fee multiplier", () => {
    render(
      <NetworkCongestionIndicator
        feeMultiplier={1.8}
        latencyMs={1600}
      />
    );

    expect(screen.getByText("Stellar Network: Moderate Load")).toBeInTheDocument();
    expect(screen.getByText(/180 stroops/)).toBeInTheDocument();
  });

  it("renders Surge Congestion when latency or multiplier exceeds surge thresholds", () => {
    render(
      <NetworkCongestionIndicator
        feeMultiplier={3.5}
        latencyMs={4200}
      />
    );

    expect(screen.getByText("Stellar Network: Surge Congestion")).toBeInTheDocument();
    expect(screen.getByText(/High congestion/)).toBeInTheDocument();
    expect(screen.getByText(/350 stroops for priority inclusion/)).toBeInTheDocument();
  });

  it("renders compact mode pill correctly", () => {
    render(
      <NetworkCongestionIndicator
        feeMultiplier={1.0}
        compact={true}
      />
    );

    const statusPill = screen.getByRole("status");
    expect(statusPill).toHaveAttribute("aria-label", "Stellar network congestion: Optimal");
    expect(statusPill).toHaveTextContent("Optimal");
  });

  it("triggers onRefresh callback when refresh icon is clicked", () => {
    const mockRefresh = jest.fn();
    render(
      <NetworkCongestionIndicator
        feeMultiplier={1.0}
        onRefresh={mockRefresh}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Refresh network metrics" }));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
