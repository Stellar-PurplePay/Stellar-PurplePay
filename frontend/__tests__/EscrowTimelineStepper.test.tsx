import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EscrowTimelineStepper } from "../components/EscrowTimelineStepper";

describe("EscrowTimelineStepper", () => {
  const mockMilestones = [
    {
      id: 1,
      title: "Architecture Specification",
      percentage: 25,
      amount: 2500,
      approved: true,
      completedAt: 1795000000,
    },
    {
      id: 2,
      title: "Smart Contract Implementation",
      percentage: 50,
      amount: 5000,
      approved: false,
    },
    {
      id: 3,
      title: "Deployment & Integration Tests",
      percentage: 25,
      amount: 2500,
      approved: false,
    },
  ];

  it("renders empty state placeholder when no milestones are provided", () => {
    render(<EscrowTimelineStepper milestones={[]} />);
    expect(screen.getByText("No milestones configured for this escrow contract.")).toBeInTheDocument();
  });

  it("calculates and displays release progress bar and percentages", () => {
    render(<EscrowTimelineStepper milestones={mockMilestones} />);

    expect(screen.getByText("Milestone Progression")).toBeInTheDocument();
    expect(screen.getByText("25% Released (1 of 3 milestones)")).toBeInTheDocument();
    expect(screen.getByText("25% / 100%")).toBeInTheDocument();

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "25");
  });

  it("displays milestone status badges and checkmark for released milestones", () => {
    render(<EscrowTimelineStepper milestones={mockMilestones} activeMilestoneId={2} />);

    expect(screen.getByText("Architecture Specification")).toBeInTheDocument();
    expect(screen.getByText("Smart Contract Implementation")).toBeInTheDocument();
    expect(screen.getByText("Deployment & Integration Tests")).toBeInTheDocument();

    expect(screen.getByText("✓")).toBeInTheDocument();
    expect(screen.getByText("Released")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("marks active milestone with aria-current='step'", () => {
    render(<EscrowTimelineStepper milestones={mockMilestones} activeMilestoneId={2} />);

    const steps = screen.getAllByRole("listitem");
    expect(steps[0]).not.toHaveAttribute("aria-current");
    expect(steps[1]).toHaveAttribute("aria-current", "step");
    expect(steps[2]).not.toHaveAttribute("aria-current");
  });

  it("invokes onSelectMilestone when a milestone item is clicked", () => {
    const mockSelect = jest.fn();
    render(
      <EscrowTimelineStepper
        milestones={mockMilestones}
        activeMilestoneId={1}
        onSelectMilestone={mockSelect}
      />
    );

    const steps = screen.getAllByRole("listitem");
    fireEvent.click(steps[1]);

    expect(mockSelect).toHaveBeenCalledWith(2);
  });
});

