import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TestnetFaucetButton from "../components/TestnetFaucetButton";

describe("TestnetFaucetButton Component", () => {
  const mockPublicKey = "GBEXAMPLEPUBLICKEYTESTNETFAUCETAAAAAAAAAAAAAAAAAAA";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render button in idle state and handle successful funding", async () => {
    const onFundedMock = jest.fn();
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ txHash: "0x123456789abcdef" }),
      headers: new Headers(),
    });

    render(
      <TestnetFaucetButton
        publicKey={mockPublicKey}
        onFunded={onFundedMock}
      />
    );

    const button = screen.getByRole("button", { name: /Request Testnet XLM/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("faucet-success-msg")).toBeInTheDocument();
    });

    expect(screen.getByText(/Funded! Tx: 0x12345678.../i)).toBeInTheDocument();
    expect(onFundedMock).toHaveBeenCalledWith("0x123456789abcdef");
  });

  it("should handle 429 rate limit with retry-after header", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Headers({ "Retry-After": "45" }),
      json: async () => ({ error: "Too many requests" }),
    });

    render(<TestnetFaucetButton publicKey={mockPublicKey} />);

    const button = screen.getByRole("button", { name: /Request Testnet XLM/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("faucet-error-msg")).toBeInTheDocument();
    });

    expect(screen.getByText(/Rate limit exceeded. Please wait 45s/i)).toBeInTheDocument();
    expect(button).toBeDisabled();
    expect(screen.getByText(/Cooldown \(45s\)/i)).toBeInTheDocument();
  });
});
