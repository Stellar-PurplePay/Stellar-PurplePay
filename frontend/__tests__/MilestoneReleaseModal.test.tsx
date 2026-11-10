import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MilestoneReleaseModal } from "../components/MilestoneReleaseModal";

describe("MilestoneReleaseModal", () => {
  const mockMilestone = {
    id: 1,
    title: "Core Smart Contract Implementation",
    amount: 1000,
  };
  const mockFreelancer = "GBBD6W7J4T6J47X6C6Q3S7D4O445X4J7G4Y6B6V4W7J4T6J47X6C6Q3S";

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <MilestoneReleaseModal
        isOpen={false}
        onClose={jest.fn()}
        jobId="job-1"
        milestone={mockMilestone}
        freelancerAddress={mockFreelancer}
        onConfirmRelease={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders milestone breakdown with 2% fee and net payout", () => {
    render(
      <MilestoneReleaseModal
        isOpen={true}
        onClose={jest.fn()}
        jobId="job-1"
        milestone={mockMilestone}
        freelancerAddress={mockFreelancer}
        tokenSymbol="XLM"
        onConfirmRelease={jest.fn()}
      />
    );

    expect(screen.getByText("Approve & Release Milestone")).toBeInTheDocument();
    expect(screen.getByText("Milestone #1")).toBeInTheDocument();
    expect(screen.getByText("Core Smart Contract Implementation")).toBeInTheDocument();
    expect(screen.getByText("1,000.00 XLM")).toBeInTheDocument();
    expect(screen.getByText("- 20.00 XLM")).toBeInTheDocument();
    expect(screen.getByText("980.00 XLM")).toBeInTheDocument();
  });

  it("requires confirmation checkbox to enable release button", () => {
    render(
      <MilestoneReleaseModal
        isOpen={true}
        onClose={jest.fn()}
        jobId="job-1"
        milestone={mockMilestone}
        freelancerAddress={mockFreelancer}
        onConfirmRelease={jest.fn()}
      />
    );

    const releaseBtn = screen.getByRole("button", { name: /Confirm & Release/i });
    expect(releaseBtn).toBeDisabled();

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(releaseBtn).not.toBeDisabled();
  });

  it("triggers onConfirmRelease when confirmed and clicked", async () => {
    const mockRelease = jest.fn().mockResolvedValue(undefined);
    const mockClose = jest.fn();

    render(
      <MilestoneReleaseModal
        isOpen={true}
        onClose={mockClose}
        jobId="job-1"
        milestone={mockMilestone}
        freelancerAddress={mockFreelancer}
        onConfirmRelease={mockRelease}
      />
    );

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Confirm & Release/i }));

    await waitFor(() => {
      expect(mockRelease).toHaveBeenCalledWith(1);
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  it("displays error alert when release fails", async () => {
    const mockRelease = jest.fn().mockRejectedValue(new Error("Soroban simulation failed"));

    render(
      <MilestoneReleaseModal
        isOpen={true}
        onClose={jest.fn()}
        jobId="job-1"
        milestone={mockMilestone}
        freelancerAddress={mockFreelancer}
        onConfirmRelease={mockRelease}
      />
    );

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Confirm & Release/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Soroban simulation failed");
    });
  });
});

