import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TransactionFeeSelector } from "../components/TransactionFeeSelector";

describe("TransactionFeeSelector component", () => {
  it("renders 3 fee tiers with radio roles", () => {
    render(<TransactionFeeSelector selectedTierId="standard" onSelectTier={jest.fn()} />);

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);

    expect(screen.getByText("Standard")).toBeInTheDocument();
    expect(screen.getByText("Fast")).toBeInTheDocument();
    expect(screen.getByText("Urgent")).toBeInTheDocument();
  });

  it("marks the selected tier as checked", () => {
    render(<TransactionFeeSelector selectedTierId="fast" onSelectTier={jest.fn()} />);

    const fastRadio = screen.getByRole("radio", { name: /fast/i });
    expect(fastRadio).toHaveAttribute("aria-checked", "true");

    const standardRadio = screen.getByRole("radio", { name: /standard/i });
    expect(standardRadio).toHaveAttribute("aria-checked", "false");
  });

  it("calls onSelectTier callback when tier card is clicked", () => {
    const handleSelect = jest.fn();
    render(<TransactionFeeSelector selectedTierId="standard" onSelectTier={handleSelect} />);

    const urgentRadio = screen.getByRole("radio", { name: /urgent/i });
    fireEvent.click(urgentRadio);

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "urgent",
        feeStroops: 300,
        feeXlm: "0.0000300",
      })
    );
  });
});
