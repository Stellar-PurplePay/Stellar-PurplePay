import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { StellarAddressInput } from "../components/StellarAddressInput";

describe("StellarAddressInput component", () => {
  const validG = "GCGQCFTEFE4W5BNG2QXJN4244ZCQMGLO6G5X65NILEKVLGZTSNZUVHJP";

  it("renders with default label and placeholder", () => {
    render(<StellarAddressInput value="" onChange={jest.fn()} />);

    expect(screen.getByLabelText("Stellar Recipient Address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("G... or user*domain.com")).toBeInTheDocument();
  });

  it("shows valid ED25519 badge when valid address is provided", () => {
    render(<StellarAddressInput value={validG} onChange={jest.fn()} />);

    expect(screen.getByText("ED25519")).toBeInTheDocument();
    const input = screen.getByLabelText("Stellar Recipient Address");
    expect(input).toHaveAttribute("aria-invalid", "false");
  });

  it("shows error alert and aria-invalid when invalid address is entered", () => {
    render(<StellarAddressInput value="G12345_corrupted" onChange={jest.fn()} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Unrecognized Stellar address format");
    const input = screen.getByLabelText("Stellar Recipient Address");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("calls onChange callback with input string and validation payload", () => {
    const handleChange = jest.fn();
    render(<StellarAddressInput value="" onChange={handleChange} />);

    const input = screen.getByLabelText("Stellar Recipient Address");
    fireEvent.change(input, { target: { value: "alice*stellar.org" } });

    expect(handleChange).toHaveBeenCalledWith(
      "alice*stellar.org",
      expect.objectContaining({
        isValid: true,
        type: "federated",
      })
    );
  });
});
