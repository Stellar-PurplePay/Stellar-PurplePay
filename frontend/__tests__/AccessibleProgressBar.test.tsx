import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AccessibleProgressBar } from "../components/AccessibleProgressBar";

describe("AccessibleProgressBar", () => {
  it("renders with valid ARIA attributes and percentage text", () => {
    render(
      <AccessibleProgressBar
        value={75}
        max={100}
        label="Escrow Settlement Progress"
      />
    );

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "75");
    expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "100");
    expect(progressBar).toHaveAttribute("aria-valuetext", "75 percent completed");

    expect(screen.getByText("Escrow Settlement Progress")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("renders screen reader announcement with aria-live", () => {
    render(
      <AccessibleProgressBar
        value={50}
        label="Funding Progress"
        ariaLive="polite"
      />
    );

    const srText = screen.getByText("Funding Progress: 50% completed");
    expect(srText).toHaveClass("sr-only");
    expect(srText).toHaveAttribute("aria-live", "polite");
  });

  it("applies high contrast borders when highContrast is true", () => {
    const { container } = render(
      <AccessibleProgressBar
        value={30}
        label="Dispute Review"
        highContrast={true}
      />
    );

    const barContainer = container.querySelector(".border-2");
    expect(barContainer).toBeInTheDocument();
    expect(barContainer).toHaveClass("border-black");
  });

  it("clamps percentages correctly for values exceeding max or below 0", () => {
    const { rerender } = render(
      <AccessibleProgressBar
        value={150}
        max={100}
        label="Overflow Test"
      />
    );
    expect(screen.getByText("100%")).toBeInTheDocument();

    rerender(
      <AccessibleProgressBar
        value={-20}
        max={100}
        label="Underflow Test"
      />
    );
    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});

