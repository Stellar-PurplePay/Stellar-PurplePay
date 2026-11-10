import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContractUpgradeNoticeBanner } from "../components/ContractUpgradeNoticeBanner";

describe("ContractUpgradeNoticeBanner", () => {
  const sampleHash = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

  it("renders pending timelock with countdown timer and truncated hash", () => {
    const current = 1000;
    const unlock = 1000 + 7200; // 2 hours

    render(
      <ContractUpgradeNoticeBanner
        newWasmHash={sampleHash}
        unlockTimestamp={unlock}
        currentTimestamp={current}
      />
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Protocol Upgrade Timelock Active/i)).toBeInTheDocument();
    expect(screen.getByTestId("wasm-code-hash")).toHaveTextContent("12345678...90abcdef");
    expect(screen.getByTestId("countdown-timer")).toHaveTextContent("2h 0m 0s");
  });

  it("renders ready to execute state and invokes onExecute when button clicked", () => {
    const onExecute = jest.fn();
    const current = 5000;
    const unlock = 5000; // Mature

    render(
      <ContractUpgradeNoticeBanner
        newWasmHash={sampleHash}
        unlockTimestamp={unlock}
        currentTimestamp={current}
        canExecute={true}
        onExecute={onExecute}
      />
    );

    expect(screen.getByText(/Ready to Execute/i)).toBeInTheDocument();
    const button = screen.getByTestId("execute-upgrade-button");
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onExecute).toHaveBeenCalledTimes(1);
  });

  it("does not show execute button if canExecute is false", () => {
    render(
      <ContractUpgradeNoticeBanner
        newWasmHash={sampleHash}
        unlockTimestamp={1000}
        currentTimestamp={2000}
        canExecute={false}
      />
    );

    expect(screen.queryByTestId("execute-upgrade-button")).not.toBeInTheDocument();
  });
});

