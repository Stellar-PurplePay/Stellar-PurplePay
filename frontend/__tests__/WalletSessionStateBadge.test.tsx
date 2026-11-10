import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WalletSessionStateBadge } from "../components/WalletSessionStateBadge";

describe("WalletSessionStateBadge", () => {
  const sampleKey = "GBBD67IFDDZZT6HGLP5OHISZ5X23LHDG6CEZZY2V4A27HWTEX7B2C6D2";

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it("renders truncated address and network badge", () => {
    render(
      <WalletSessionStateBadge
        publicKey={sampleKey}
        network="Testnet"
      />
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByTestId("copy-address-button")).toHaveTextContent("GBBD67...B2C6D2");
    expect(screen.getByTestId("network-badge")).toHaveTextContent("Testnet");
  });

  it("copies public key to clipboard when clicked", async () => {
    render(<WalletSessionStateBadge publicKey={sampleKey} />);

    const copyBtn = screen.getByTestId("copy-address-button");
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(sampleKey);
    await waitFor(() => {
      expect(screen.getByTestId("copied-tooltip")).toHaveTextContent("Copied!");
    });
  });

  it("triggers onDisconnect when disconnect button is clicked", () => {
    const onDisconnect = jest.fn();
    render(
      <WalletSessionStateBadge
        publicKey={sampleKey}
        onDisconnect={onDisconnect}
      />
    );

    const btn = screen.getByTestId("disconnect-button");
    fireEvent.click(btn);
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });
});
