import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { NetworkCongestionBanner } from "../components/NetworkCongestionBanner";

describe("NetworkCongestionBanner", () => {
  it("does not render when fee is at or below threshold", () => {
    const { container } = render(
      <NetworkCongestionBanner
        currentBaseFeeStroops={500}
        surgeThresholdStroops={1000}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders congestion warning and calculates recommended fee during fee spike", () => {
    render(
      <NetworkCongestionBanner
        currentBaseFeeStroops={2500}
        surgeThresholdStroops={1000}
      />
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Stellar Network Congestion Warning")).toBeInTheDocument();
    expect(screen.getByTestId("surge-fee-text")).toHaveTextContent("2,500 stroops");
    expect(screen.getByText(/\(25x baseline\)/i)).toBeInTheDocument();
    // 2500 * 1.25 = 3125
    expect(screen.getByTestId("recommended-fee-text")).toHaveTextContent("3,125 stroops");
  });

  it("dismisses banner when close button is clicked", () => {
    const onDismiss = jest.fn();
    const { container } = render(
      <NetworkCongestionBanner
        currentBaseFeeStroops={3000}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("dismiss-banner-button"));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(container.firstChild).toBeNull();
  });
});

