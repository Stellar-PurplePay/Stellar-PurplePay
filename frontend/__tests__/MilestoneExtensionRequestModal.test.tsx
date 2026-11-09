import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MilestoneExtensionRequestModal } from "../components/MilestoneExtensionRequestModal";

describe("MilestoneExtensionRequestModal", () => {
  // Fixed timestamp: 2026-12-01T00:00:00Z -> 1796083200
  const fixedDeadline = 1796083200;

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <MilestoneExtensionRequestModal
        isOpen={false}
        onClose={jest.fn()}
        jobId="job-99"
        milestoneId={2}
        currentDeadline={fixedDeadline}
        onRequestExtension={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders current and proposed deadlines", () => {
    render(
      <MilestoneExtensionRequestModal
        isOpen={true}
        onClose={jest.fn()}
        jobId="job-99"
        milestoneId={2}
        currentDeadline={fixedDeadline}
        onRequestExtension={jest.fn()}
      />
    );

    expect(screen.getByText("Request Deadline Extension")).toBeInTheDocument();
    expect(screen.getByText("Current Target Deadline:")).toBeInTheDocument();
    expect(screen.getByText("Proposed New Deadline:")).toBeInTheDocument();
  });

  it("changes additional days when preset buttons are clicked", () => {
    render(
      <MilestoneExtensionRequestModal
        isOpen={true}
        onClose={jest.fn()}
        jobId="job-99"
        milestoneId={2}
        currentDeadline={fixedDeadline}
        onRequestExtension={jest.fn()}
      />
    );

    const btn14 = screen.getByRole("button", { name: "+14d" });
    fireEvent.click(btn14);
    expect(screen.getByText(/Select Additional Days \(\+14 days\)/)).toBeInTheDocument();

    const btn30 = screen.getByRole("button", { name: "+30d" });
    fireEvent.click(btn30);
    expect(screen.getByText(/Select Additional Days \(\+30 days\)/)).toBeInTheDocument();
  });

  it("requires minimum 10 characters for justification before enabling submit", () => {
    render(
      <MilestoneExtensionRequestModal
        isOpen={true}
        onClose={jest.fn()}
        jobId="job-99"
        milestoneId={2}
        currentDeadline={fixedDeadline}
        onRequestExtension={jest.fn()}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Send Extension Request/i });
    expect(submitBtn).toBeDisabled();

    const textarea = screen.getByLabelText(/Justification/i);
    fireEvent.change(textarea, { target: { value: "Short" } });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(textarea, { target: { value: "Requires Soroban RPC upgrade on testnet." } });
    expect(submitBtn).not.toBeDisabled();
  });

  it("submits extension request and closes on success", async () => {
    const mockRequest = jest.fn().mockResolvedValue(undefined);
    const mockClose = jest.fn();

    render(
      <MilestoneExtensionRequestModal
        isOpen={true}
        onClose={mockClose}
        jobId="job-99"
        milestoneId={2}
        currentDeadline={fixedDeadline}
        onRequestExtension={mockRequest}
      />
    );

    // Select +14 days
    fireEvent.click(screen.getByRole("button", { name: "+14d" }));

    // Enter justification
    fireEvent.change(screen.getByLabelText(/Justification/i), {
      target: { value: "Awaiting Soroban security audit feedback before release." },
    });

    fireEvent.click(screen.getByRole("button", { name: /Send Extension Request/i }));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledWith(
        "job-99",
        2,
        14,
        "Awaiting Soroban security audit feedback before release."
      );
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  it("displays error message when submission fails", async () => {
    const mockRequest = jest.fn().mockRejectedValue(new Error("Network timeout during request"));

    render(
      <MilestoneExtensionRequestModal
        isOpen={true}
        onClose={jest.fn()}
        jobId="job-99"
        milestoneId={2}
        currentDeadline={fixedDeadline}
        onRequestExtension={mockRequest}
      />
    );

    fireEvent.change(screen.getByLabelText(/Justification/i), {
      target: { value: "Awaiting Soroban security audit feedback before release." },
    });

    fireEvent.click(screen.getByRole("button", { name: /Send Extension Request/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Network timeout during request");
    });
  });
});
