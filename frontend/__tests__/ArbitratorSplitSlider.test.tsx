import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ArbitratorSplitSlider } from "../components/ArbitratorSplitSlider";

describe("ArbitratorSplitSlider", () => {
  const mockClient = "GBBD6W7J4T6J47X6C6Q3S7D4O445X4J7G4Y6B6V4W7J4T6J47X6C6Q3S";
  const mockFreelancer = "GCLUST3R4T6J47X6C6Q3S7D4O445X4J7G4Y6B6V4W7J4T6J47X6C6XYZ";

  it("renders 50/50 default split and conserved pool amount", () => {
    render(
      <ArbitratorSplitSlider
        disputedAmount={10000}
        clientAddress={mockClient}
        freelancerAddress={mockFreelancer}
        onConfirmSplit={jest.fn()}
      />
    );

    expect(screen.getByText("Arbitrated Dispute Settlement")).toBeInTheDocument();
    expect(screen.getByText("Total Disputed Pool:")).toBeInTheDocument();
    expect(screen.getAllByText("5,000.00 XLM")).toHaveLength(2);
    expect(screen.getAllByText("50%")).toHaveLength(2);
    expect(screen.getByText(/100% Conserved/)).toBeInTheDocument();
  });

  it("updates split distribution when presets are selected", () => {
    render(
      <ArbitratorSplitSlider
        disputedAmount={10000}
        clientAddress={mockClient}
        freelancerAddress={mockFreelancer}
        onConfirmSplit={jest.fn()}
      />
    );

    // Click 100% Client preset
    fireEvent.click(screen.getByRole("button", { name: "100% Client" }));
    expect(screen.getAllByText("10,000.00 XLM").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("0.00 XLM")).toBeInTheDocument();

    // Click 100% Freelancer preset
    fireEvent.click(screen.getByRole("button", { name: "100% Freelancer" }));
    expect(screen.getByText("0.00 XLM")).toBeInTheDocument();
    expect(screen.getAllByText("10,000.00 XLM").length).toBeGreaterThanOrEqual(2);
  });

  it("adjusts slider value and fires onSplitChange", () => {
    const mockSplitChange = jest.fn();
    render(
      <ArbitratorSplitSlider
        disputedAmount={1000}
        clientAddress={mockClient}
        freelancerAddress={mockFreelancer}
        onSplitChange={mockSplitChange}
        onConfirmSplit={jest.fn()}
      />
    );

    const slider = screen.getByLabelText("Dispute split ratio");
    fireEvent.change(slider, { target: { value: "80" } });

    expect(screen.getByText("800.00 XLM")).toBeInTheDocument();
    expect(screen.getByText("200.00 XLM")).toBeInTheDocument();
    expect(mockSplitChange).toHaveBeenCalledWith(80, 800, 200);
  });

  it("invokes onConfirmSplit with computed amounts on settlement execution", async () => {
    const mockConfirm = jest.fn().mockResolvedValue(undefined);
    render(
      <ArbitratorSplitSlider
        disputedAmount={5000}
        initialClientPercentage={60}
        clientAddress={mockClient}
        freelancerAddress={mockFreelancer}
        onConfirmSplit={mockConfirm}
      />
    );

    const confirmBtn = screen.getByRole("button", { name: /Enforce Arbitrated Settlement/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(3000, 2000);
    });
  });

  it("displays error banner when confirmation fails", async () => {
    const mockConfirm = jest.fn().mockRejectedValue(new Error("Soroban contract error #14"));
    render(
      <ArbitratorSplitSlider
        disputedAmount={5000}
        clientAddress={mockClient}
        freelancerAddress={mockFreelancer}
        onConfirmSplit={mockConfirm}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Enforce Arbitrated Settlement/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Soroban contract error #14");
    });
  });
});
