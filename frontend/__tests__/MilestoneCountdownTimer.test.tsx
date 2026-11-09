import React from "react";
import { render, screen } from "@testing-library/react";
import { MilestoneCountdownTimer } from "../components/MilestoneCountdownTimer";

describe("MilestoneCountdownTimer", () => {
  it("renders 'No deadline set' when timestamp is missing or zero", () => {
    render(<MilestoneCountdownTimer deadlineTimestamp={null} />);
    expect(screen.getByText("No deadline set")).toBeInTheDocument();
  });

  it("renders '✓ Completed' badge when isApproved is true", () => {
    const futureTime = Math.floor(Date.now() / 1000) + 10000;
    render(<MilestoneCountdownTimer deadlineTimestamp={futureTime} isApproved={true} />);
    expect(screen.getByText("✓ Completed")).toBeInTheDocument();
  });

  it("renders 'Deadline Expired' alert badge when deadline is in the past", () => {
    const pastTime = Math.floor(Date.now() / 1000) - 300;
    render(<MilestoneCountdownTimer deadlineTimestamp={pastTime} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Deadline Expired");
  });

  it("renders remaining time countdown when deadline is in the future", () => {
    const futureTime = Math.floor(Date.now() / 1000) + 7200; // 2 hours
    render(<MilestoneCountdownTimer deadlineTimestamp={futureTime} />);
    const timer = screen.getByRole("timer");
    expect(timer).toBeInTheDocument();
    expect(timer.textContent).toContain("remaining");
  });
});
