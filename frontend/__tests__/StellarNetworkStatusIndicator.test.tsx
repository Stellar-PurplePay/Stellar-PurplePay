import React from "react";
import { render, screen } from "@testing-library/react";
import { StellarNetworkStatusIndicator } from "../components/StellarNetworkStatusIndicator";

describe("StellarNetworkStatusIndicator component", () => {
  it("renders healthy testnet pill with status role", () => {
    render(
      <StellarNetworkStatusIndicator
        network="testnet"
        status="healthy"
        latencyMs={125}
        latestLedger={854321}
      />
    );

    const statusElem = screen.getByRole("status");
    expect(statusElem).toHaveAttribute("aria-label", "Stellar TESTNET: Operational (125ms)");
    expect(screen.getByText("TESTNET")).toBeInTheDocument();
    expect(screen.getByText("#854321")).toBeInTheDocument();
    expect(screen.getByText("125ms")).toBeInTheDocument();
  });

  it("renders unhealthy mainnet pill when node is offline", () => {
    render(
      <StellarNetworkStatusIndicator
        network="mainnet"
        status="unhealthy"
      />
    );

    const statusElem = screen.getByRole("status");
    expect(statusElem).toHaveAttribute("aria-label", "Stellar MAINNET: Node Offline");
    expect(screen.getByText("MAINNET")).toBeInTheDocument();
  });
});
