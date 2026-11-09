import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PartialReleaseModal } from "../components/PartialReleaseModal";

describe("PartialReleaseModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    jobId: "job-101",
    milestoneId: 1,
    totalMilestoneAmount: "500.0000000",
    remainingMilestoneAmount: "300.0000000",
    asset: "XLM",
  };

  it("does not render when isOpen is false", () => {
    const { container } = render(<PartialReleaseModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders modal with balance overview and presets", () => {
    render(<PartialReleaseModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Partial Milestone Release")).toBeInTheDocument();
    expect(screen.getByText(/300 XLM/i)).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("calculates preset percentage into input field", () => {
    render(<PartialReleaseModal {...defaultProps} />);
    fireEvent.click(screen.getByText("50%"));
    const input = screen.getByLabelText(/Amount to Release/i) as HTMLInputElement;
    expect(input.value).toBe("150");
  });

  it("validates and submits on valid input", () => {
    const handleConfirm = jest.fn();
    render(<PartialReleaseModal {...defaultProps} onConfirm={handleConfirm} />);

    const input = screen.getByLabelText(/Amount to Release/i);
    fireEvent.change(input, { target: { value: "120.5" } });

    fireEvent.click(screen.getByRole("button", { name: /Release 120.5 XLM/i }));
    expect(handleConfirm).toHaveBeenCalledWith("120.5");
  });

  it("displays error when amount exceeds remaining balance", () => {
    render(<PartialReleaseModal {...defaultProps} />);

    const input = screen.getByLabelText(/Amount to Release/i);
    fireEvent.change(input, { target: { value: "350" } });

    fireEvent.click(screen.getByRole("button", { name: /Release 350 XLM/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Cannot release more than the remaining milestone balance");
  });

  it("calls onClose when Cancel is clicked", () => {
    const handleClose = jest.fn();
    render(<PartialReleaseModal {...defaultProps} onClose={handleClose} />);

    fireEvent.click(screen.getByText("Cancel"));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
