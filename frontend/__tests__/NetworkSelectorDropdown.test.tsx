import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import NetworkSelectorDropdown from "../components/NetworkSelectorDropdown";

describe("NetworkSelectorDropdown Component", () => {
  it("should render default testnet network selection and amber indicator", () => {
    render(<NetworkSelectorDropdown activeNetwork="testnet" />);

    const select = screen.getByTestId("network-select") as HTMLSelectElement;
    expect(select.value).toBe("testnet");

    const indicator = screen.getByTestId("network-status-indicator");
    expect(indicator).toHaveClass("bg-amber-500");
    expect(screen.queryByTestId("mainnet-warning")).not.toBeInTheDocument();
  });

  it("should trigger onNetworkChange callback and update UI when selecting mainnet", () => {
    const onChangeMock = jest.fn();
    render(
      <NetworkSelectorDropdown
        activeNetwork="testnet"
        onNetworkChange={onChangeMock}
      />
    );

    const select = screen.getByTestId("network-select");
    fireEvent.change(select, { target: { value: "public" } });

    expect(onChangeMock).toHaveBeenCalledWith("public");

    const indicator = screen.getByTestId("network-status-indicator");
    expect(indicator).toHaveClass("bg-emerald-500");
    expect(screen.getByTestId("mainnet-warning")).toBeInTheDocument();
    expect(screen.getByText("Live Funds")).toBeInTheDocument();
  });
});

