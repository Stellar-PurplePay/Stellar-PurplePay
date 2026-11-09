import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import NetworkMismatchBanner from "../components/NetworkMismatchBanner";
import { TESTNET_PASSPHRASE, MAINNET_PASSPHRASE } from "../utils/networkValidator";

describe("NetworkMismatchBanner", () => {
  it("renders nothing when wallet passphrase is not provided", () => {
    const { container } = render(<NetworkMismatchBanner appNetwork="testnet" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when networks match", () => {
    const { container } = render(
      <NetworkMismatchBanner appNetwork="testnet" walletPassphrase={TESTNET_PASSPHRASE} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders alert banner when wallet passphrase differs from app network", () => {
    render(
      <NetworkMismatchBanner appNetwork="testnet" walletPassphrase={MAINNET_PASSPHRASE} />
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/Network Mismatch/i);
    expect(alert).toHaveTextContent(/Stellar Testnet/i);
    expect(alert).toHaveTextContent(/Stellar Public Network \(Mainnet\)/i);
  });

  it("dismisses banner when dismiss button is clicked", () => {
    const onDismiss = jest.fn();
    render(
      <NetworkMismatchBanner
        appNetwork="testnet"
        walletPassphrase={MAINNET_PASSPHRASE}
        onDismiss={onDismiss}
      />
    );

    const button = screen.getByRole("button", { name: /dismiss/i });
    fireEvent.click(button);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
