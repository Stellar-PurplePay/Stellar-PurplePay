import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MilestoneExtensionModal } from "../components/MilestoneExtensionModal";

describe("MilestoneExtensionModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    jobId: "job-101",
    milestoneId: 1,
    currentDeadlineTimestamp: 1700000000,
  };

  it("does not render when isOpen is false", () => {
    const { container } = render(<MilestoneExtensionModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders modal dialog with presets and projected deadline", () => {
    render(<MilestoneExtensionModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Extend Milestone Deadline")).toBeInTheDocument();
    expect(screen.getByText("+3 Days")).toBeInTheDocument();
    expect(screen.getByText(/Projected New Deadline:/i)).toBeInTheDocument();
  });

  it("allows selecting preset days", () => {
    render(<MilestoneExtensionModal {...defaultProps} />);
    const sevenDaysBtn = screen.getByText("+7 Days");
    fireEvent.click(sevenDaysBtn);
    expect(screen.getByRole("button", { name: /Confirm Extension \(\+7d\)/i })).toBeInTheDocument();
  });

  it("submits extension with selected seconds and notes", () => {
    const handleConfirm = jest.fn();
    render(<MilestoneExtensionModal {...defaultProps} onConfirm={handleConfirm} />);

    const reasonInput = screen.getByLabelText(/Reason \/ Notes/i);
    fireEvent.change(reasonInput, { target: { value: "Extra revision needed" } });

    const submitBtn = screen.getByRole("button", { name: /Confirm Extension/i });
    fireEvent.click(submitBtn);

    expect(handleConfirm).toHaveBeenCalledWith(3 * 86400, "Extra revision needed");
  });

  it("calls onClose when Cancel button or close icon is clicked", () => {
    const handleClose = jest.fn();
    render(<MilestoneExtensionModal {...defaultProps} onClose={handleClose} />);

    fireEvent.click(screen.getByText("Cancel"));
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
